"""
RABTA Blood Bank Inventory Management & Reservation Transactions System
Handles inventory additions, updates, reservations, expiry protection,
and atomic unit allocations with audit logs.
"""

import sqlite3
from datetime import datetime, timezone
from typing import Dict, Any, Optional

class InventoryManager:
    def __init__(self, db_conn: sqlite3.Connection):
        self.conn = db_conn

    def get_bank_inventory(self, blood_bank_id: int) -> list:
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT bi.*, bbb.branch_name,
                   CASE WHEN date(bi.expiry_date) < date('now') THEN 'expired' ELSE bi.verification_status END as computed_status
            FROM blood_inventory bi
            LEFT JOIN blood_bank_branches bbb ON bi.branch_id = bbb.id
            WHERE bi.blood_bank_id = ?
            ORDER BY bi.blood_group ASC, bi.expiry_date ASC;
        """, (blood_bank_id,))
        return [dict(r) for r in cursor.fetchall()]

    def add_inventory_batch(self, blood_bank_id: int, branch_id: Optional[int], blood_group: str,
                            units: int, collection_date: str, expiry_date: str, batch_number: str) -> dict:
        cursor = self.conn.cursor()
        if units <= 0:
            raise ValueError("Units must be a positive integer.")
        if blood_group not in ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']:
            raise ValueError("Invalid ABO/Rh blood group.")

        cursor.execute("""
            INSERT INTO blood_inventory (
                blood_bank_id, branch_id, blood_group, available_units, reserved_units,
                collection_date, expiry_date, batch_number, verification_status, last_updated
            ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, 'confirmed', datetime('now', 'utc'));
        """, (blood_bank_id, branch_id or 1, blood_group, units, collection_date, expiry_date, batch_number))
        inv_id = cursor.lastrowid

        # Audit log
        cursor.execute("""
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details_json)
            VALUES (NULL, 'INVENTORY_ADD', 'blood_inventory', ?, ?);
        """, (inv_id, f'{{"blood_group": "{blood_group}", "units": {units}, "batch": "{batch_number}"}}'))

        self.conn.commit()
        return {"id": inv_id, "status": "success", "message": f"Added {units} units of {blood_group} batch {batch_number}."}

    def update_inventory_units(self, inventory_id: int, blood_bank_id: int, new_available: int) -> dict:
        cursor = self.conn.cursor()
        if new_available < 0:
            raise ValueError("Available units cannot be negative.")

        cursor.execute("SELECT * FROM blood_inventory WHERE id = ? AND blood_bank_id = ?;", (inventory_id, blood_bank_id))
        row = cursor.fetchone()
        if not row:
            raise ValueError("Inventory record not found or access denied.")

        cursor.execute("""
            UPDATE blood_inventory 
            SET available_units = ?, last_updated = datetime('now', 'utc')
            WHERE id = ?;
        """, (new_available, inventory_id))

        cursor.execute("""
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details_json)
            VALUES (NULL, 'INVENTORY_UPDATE', 'blood_inventory', ?, ?);
        """, (inventory_id, f'{{"previous": {row["available_units"]}, "updated": {new_available}}}'))

        self.conn.commit()
        return {"status": "success", "message": f"Inventory updated to {new_available} units."}

    def reserve_units(self, request_id: int, blood_bank_id: int, blood_group: str,
                      units_needed: int, notes: str = "") -> dict:
        """
        Atomic reservation operation:
        Verifies unexpired stock exists, decrements available_units,
        increments reserved_units, and creates inventory_reservations record.
        """
        cursor = self.conn.cursor()
        try:
            # 1. Check eligible inventory with lock
            cursor.execute("""
                SELECT id, available_units 
                FROM blood_inventory 
                WHERE blood_bank_id = ? 
                  AND blood_group = ? 
                  AND available_units >= ?
                  AND verification_status = 'confirmed'
                  AND date(expiry_date) >= date('now')
                ORDER BY expiry_date ASC LIMIT 1;
            """, (blood_bank_id, blood_group, units_needed))
            batch = cursor.fetchone()

            if not batch:
                return {
                    "success": False,
                    "message": f"Insufficient unreserved, unexpired {blood_group} inventory at this facility to reserve {units_needed} units."
                }

            inv_id = batch['id']

            # 2. Atomically update inventory
            cursor.execute("""
                UPDATE blood_inventory 
                SET available_units = available_units - ?,
                    reserved_units = reserved_units + ?,
                    last_updated = datetime('now', 'utc')
                WHERE id = ? AND available_units >= ?;
            """, (units_needed, units_needed, inv_id, units_needed))

            if cursor.rowcount == 0:
                return {"success": False, "message": "Concurrent update conflict. Reservation aborted."}

            # 3. Create reservation record
            cursor.execute("""
                INSERT INTO inventory_reservations (
                    request_id, blood_bank_id, inventory_id, blood_group, units_reserved,
                    status, reservation_notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, 'confirmed', ?, datetime('now', 'utc'), datetime('now', 'utc'));
            """, (request_id, blood_bank_id, inv_id, blood_group, units_needed, notes))
            res_id = cursor.lastrowid

            # 4. Advance blood request status
            cursor.execute("""
                UPDATE blood_requests 
                SET status = 'blood_bank_confirmation', updated_at = datetime('now', 'utc')
                WHERE id = ?;
            """, (request_id,))

            # 5. Log audit
            cursor.execute("""
                INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details_json)
                VALUES (NULL, 'INVENTORY_RESERVE', 'inventory_reservations', ?, ?);
            """, (res_id, f'{{"request_id": {request_id}, "bank_id": {blood_bank_id}, "units": {units_needed}}}'))

            self.conn.commit()
            return {
                "success": True,
                "reservation_id": res_id,
                "message": f"Successfully reserved {units_needed} units of {blood_group}."
            }
        except Exception as e:
            self.conn.rollback()
            return {"success": False, "message": str(e)}

    def dispense_and_fulfill(self, reservation_id: int, user_id: int) -> dict:
        """
        Marks reserved units as dispensed, completes request as fulfilled,
        and records platform transaction and fee.
        """
        cursor = self.conn.cursor()
        try:
            cursor.execute("""
                SELECT ir.*, bb.package_id, p.commission_percent, br.request_code, br.requester_user_id
                FROM inventory_reservations ir
                JOIN blood_banks bb ON ir.blood_bank_id = bb.id
                LEFT JOIN packages p ON bb.package_id = p.id
                JOIN blood_requests br ON ir.request_id = br.id
                WHERE ir.id = ?;
            """, (reservation_id,))
            res = cursor.fetchone()
            if not res:
                return {"success": False, "message": "Reservation not found."}

            res = dict(res)
            inv_id = res['inventory_id']
            units = res['units_reserved']
            req_id = res['request_id']
            bb_id = res['blood_bank_id']
            comm_pct = res.get('commission_percent') or 5.0 # default 5%
            base_fee = 1000.0 * units # Nominal processing/screening coordination reference
            comm_amt = round((base_fee * comm_pct) / 100.0, 2)

            # 1. Update inventory: decrement reserved units
            if inv_id:
                cursor.execute("""
                    UPDATE blood_inventory 
                    SET reserved_units = MAX(0, reserved_units - ?),
                        last_updated = datetime('now', 'utc')
                    WHERE id = ?;
                """, (units, inv_id))

            # 2. Update reservation status
            cursor.execute("""
                UPDATE inventory_reservations 
                SET status = 'dispensed', updated_at = datetime('now', 'utc')
                WHERE id = ?;
            """, (reservation_id,))

            # 3. Update blood request to fulfilled
            cursor.execute("""
                UPDATE blood_requests 
                SET status = 'fulfilled', fulfilled_at = datetime('now', 'utc'), updated_at = datetime('now', 'utc')
                WHERE id = ?;
            """, (req_id,))

            # 4. Record completed transaction
            cursor.execute("""
                INSERT INTO transactions (
                    blood_bank_id, request_id, package_id, amount, commission_amount,
                    transaction_type, status, notes
                ) VALUES (?, ?, ?, ?, ?, 'service_fee', 'completed', ?);
            """, (bb_id, req_id, res.get('package_id', 2), base_fee, comm_amt, f"Fulfilled request {res['request_code']} ({units} units)."))

            # 5. Notify Requester
            cursor.execute("""
                INSERT INTO notifications (user_id, title, message, notification_type, reference_id, reference_type)
                VALUES (?, 'Request Fulfilled!', ?, 'status_change', ?, 'blood_request');
            """, (res['requester_user_id'], f"Blood units for request {res['request_code']} have been confirmed and dispensed.", req_id))

            # 6. Audit log
            cursor.execute("""
                INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details_json)
                VALUES (?, 'REQUEST_FULFILL_DISPENSE', 'blood_requests', ?, ?);
            """, (user_id, req_id, f'{{"reservation_id": {reservation_id}, "commission_amt": {comm_amt}}}'))

            self.conn.commit()
            return {"success": True, "message": "Units dispensed and request marked as fulfilled."}
        except Exception as e:
            self.conn.rollback()
            return {"success": False, "message": str(e)}

    def cancel_reservation(self, reservation_id: int) -> dict:
        """Restores reserved units back to available units."""
        cursor = self.conn.cursor()
        try:
            cursor.execute("SELECT * FROM inventory_reservations WHERE id = ?;", (reservation_id,))
            res = cursor.fetchone()
            if not res or res['status'] != 'confirmed':
                return {"success": False, "message": "Reservation not in confirmed state."}

            res = dict(res)
            if res['inventory_id']:
                cursor.execute("""
                    UPDATE blood_inventory 
                    SET reserved_units = MAX(0, reserved_units - ?),
                        available_units = available_units + ?,
                        last_updated = datetime('now', 'utc')
                    WHERE id = ?;
                """, (res['units_reserved'], res['units_reserved'], res['inventory_id']))

            cursor.execute("""
                UPDATE inventory_reservations 
                SET status = 'cancelled', updated_at = datetime('now', 'utc')
                WHERE id = ?;
            """, (reservation_id,))

            self.conn.commit()
            return {"success": True, "message": "Reservation cancelled and units returned to inventory."}
        except Exception as e:
            self.conn.rollback()
            return {"success": False, "message": str(e)}
