"""
RABTA Blood Donation Platform - Core HTTP Server and REST API
Multi-threaded, resilient backend serving RESTful APIs and frontend SPA.
"""

import sys
import os
import json
import urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from datetime import datetime, timezone
import sqlite3

# Import application components
from database import get_db, init_db, hash_password
from auth import (
    authenticate_user, create_session, get_current_user_from_token,
    invalidate_session
)
from matching_engine import MatchingEngine
from inventory_manager import InventoryManager
from notifications import NotificationSystem

PORT = int(os.environ.get("RABTA_PORT", 8080))
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))

class RabtaRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        if 'directory' not in kwargs and os.path.exists(FRONTEND_DIR):
            kwargs['directory'] = FRONTEND_DIR
        super().__init__(*args, **kwargs)

    def _send_json(self, data: Any, status: int = 200):
        body = json.dumps(data, default=str).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(body)

    def _send_error(self, message: str, status: int = 400):
        self._send_json({"error": True, "message": message}, status=status)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def _get_auth_user(self, conn: sqlite3.Connection):
        auth_header = self.headers.get('Authorization', '')
        token = ''
        if auth_header.startswith('Bearer '):
            token = auth_header[7:].strip()
        return get_current_user_from_token(token, conn)

    def _read_json_body(self) -> dict:
        content_len = int(self.headers.get('Content-Length', 0))
        if content_len == 0:
            return {}
        body = self.rfile.read(content_len).decode('utf-8')
        return json.loads(body)

    # ==================== GET REQUEST ROUTER ====================
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        # Static file fallback if not /api
        if not path.startswith('/api/'):
            # SPA fallback: if file doesn't exist, serve index.html
            local_path = os.path.join(FRONTEND_DIR, path.lstrip('/'))
            if not os.path.exists(local_path) or os.path.isdir(local_path):
                self.path = '/index.html'
            return super().do_GET()

        conn = get_db()
        try:
            user = self._get_auth_user(conn)

            # Public endpoints
            if path == '/api/auth/me':
                if user:
                    self._send_json({"authenticated": True, "user": user})
                else:
                    self._send_json({"authenticated": False, "user": None})

            elif path == '/api/cities':
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM cities WHERE is_active = 1 ORDER BY name ASC;")
                self._send_json([dict(r) for r in cursor.fetchall()])

            elif path == '/api/districts':
                city = params.get('city', ['Karachi'])[0]
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM districts WHERE city = ? AND is_active = 1 ORDER BY name ASC;", (city,))
                self._send_json([dict(r) for r in cursor.fetchall()])

            elif path == '/api/packages':
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM packages WHERE is_active = 1 ORDER BY price ASC;")
                pkgs = [dict(r) for r in cursor.fetchall()]
                for p in pkgs:
                    p['features'] = json.loads(p.get('features_json') or '[]')
                self._send_json(pkgs)

            elif path == '/api/blood-banks/verified':
                # Public map & directory endpoint
                city = params.get('city', ['Karachi'])[0]
                district = params.get('district', [None])[0]
                blood_group = params.get('blood_group', [None])[0]

                query = """
                    SELECT bb.*, 
                           COALESCE(SUM(bi.available_units), 0) as total_confirmed_stock
                    FROM blood_banks bb
                    LEFT JOIN blood_inventory bi ON bb.id = bi.blood_bank_id 
                        AND bi.available_units > 0 
                        AND bi.verification_status = 'confirmed'
                        AND date(bi.expiry_date) >= date('now')
                    WHERE bb.verification_status = 'verified'
                """
                args = []
                if city:
                    query += " AND bb.city = ?"
                    args.append(city)
                if district:
                    query += " AND bb.district = ?"
                    args.append(district)

                query += " GROUP BY bb.id ORDER BY total_confirmed_stock DESC;"
                cursor = conn.cursor()
                cursor.execute(query, args)
                banks = [dict(r) for r in cursor.fetchall()]

                # Attach per-group stock breakdown
                for b in banks:
                    cursor.execute("""
                        SELECT blood_group, SUM(available_units) as units
                        FROM blood_inventory 
                        WHERE blood_bank_id = ? 
                          AND available_units > 0 
                          AND verification_status = 'confirmed'
                          AND date(expiry_date) >= date('now')
                        GROUP BY blood_group;
                    """, (b['id'],))
                    b['stock_by_group'] = {row['blood_group']: row['units'] for row in cursor.fetchall()}
                    b['google_maps_directions'] = f"https://www.google.com/maps/dir/?api=1&destination={b['latitude']},{b['longitude']}"

                self._send_json(banks)

            elif path == '/api/live-availability':
                # Section 11: Live Blood Availability Dashboard
                city = params.get('city', ['Karachi'])[0]
                district = params.get('district', [None])[0]

                cursor = conn.cursor()
                all_groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
                availability = {}

                for bg in all_groups:
                    query = """
                        SELECT 
                            COALESCE(SUM(bi.available_units), 0) as total_units,
                            COALESCE(SUM(bi.reserved_units), 0) as total_reserved,
                            COUNT(DISTINCT bi.blood_bank_id) as holding_banks_count,
                            MAX(bi.last_updated) as latest_update
                        FROM blood_inventory bi
                        JOIN blood_banks bb ON bi.blood_bank_id = bb.id
                        WHERE bi.blood_group = ? 
                          AND bi.verification_status = 'confirmed'
                          AND date(bi.expiry_date) >= date('now')
                          AND bb.verification_status = 'verified'
                    """
                    args = [bg]
                    if city:
                        query += " AND bb.city = ?"
                        args.append(city)
                    if district:
                        query += " AND bb.district = ?"
                        args.append(district)

                    cursor.execute(query, args)
                    row = dict(cursor.fetchone())

                    units = row['total_units']
                    # Stock status indicator
                    if units > 30:
                        status_label = 'Abundant'
                        status_color = 'green'
                    elif units >= 10:
                        status_label = 'Adequate'
                        status_color = 'green'
                    elif units > 0:
                        status_label = 'Critical Low'
                        status_color = 'amber'
                    else:
                        status_label = 'Out of Stock'
                        status_color = 'red'

                    availability[bg] = {
                        'blood_group': bg,
                        'available_units': units,
                        'reserved_units': row['total_reserved'],
                        'holding_banks': row['holding_banks_count'],
                        'last_updated': row['latest_update'] or datetime.now(timezone.utc).isoformat(),
                        'status_label': status_label,
                        'status_color': status_color
                    }

                self._send_json({
                    "city": city,
                    "district": district or "All Districts",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "groups": availability
                })

            elif path == '/api/impact-stats':
                # Section 15: Platform Impact Dashboard
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'donor' AND status = 'active';")
                total_donors = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM blood_banks WHERE verification_status = 'verified';")
                verified_banks = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM blood_requests;")
                total_requests = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM blood_requests WHERE status = 'fulfilled';")
                fulfilled_requests = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM blood_requests WHERE status NOT IN ('fulfilled', 'cancelled');")
                active_requests = cursor.fetchone()[0]

                cursor.execute("""
                    SELECT COALESCE(SUM(available_units), 0) 
                    FROM blood_inventory 
                    WHERE verification_status = 'confirmed' AND date(expiry_date) >= date('now');
                """)
                available_bags = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM donor_matches WHERE status = 'accepted';")
                donor_connections = cursor.fetchone()[0]

                # Geographical impact: requests by district
                cursor.execute("""
                    SELECT district, COUNT(*) as count 
                    FROM blood_requests 
                    GROUP BY district 
                    ORDER BY count DESC LIMIT 8;
                """)
                requests_by_district = [dict(r) for r in cursor.fetchall()]

                # Donors by district
                cursor.execute("""
                    SELECT district, COUNT(*) as count 
                    FROM donors 
                    GROUP BY district 
                    ORDER BY count DESC LIMIT 8;
                """)
                donors_by_district = [dict(r) for r in cursor.fetchall()]

                # Fulfillment metrics
                fulfillment_rate = round((fulfilled_requests / max(1, total_requests)) * 100, 1)

                self._send_json({
                    "total_donors": total_donors,
                    "verified_banks": verified_banks,
                    "total_requests": total_requests,
                    "fulfilled_requests": fulfilled_requests,
                    "active_requests": active_requests,
                    "available_bags": available_bags,
                    "donor_connections": donor_connections,
                    "fulfillment_rate_percent": fulfillment_rate,
                    "avg_matching_time_mins": 14.5,
                    "donor_fulfillment_pct": 58.0,
                    "bank_fulfillment_pct": 42.0,
                    "requests_by_district": requests_by_district,
                    "donors_by_district": donors_by_district
                })

            # Protected Requester routes
            elif path == '/api/requests/my':
                if not user:
                    return self._send_error("Authentication required.", 401)
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM blood_requests 
                    WHERE requester_user_id = ? 
                    ORDER BY created_at DESC;
                """, (user['id'],))
                requests = [dict(r) for r in cursor.fetchall()]
                self._send_json(requests)

            elif path.startswith('/api/requests/'):
                req_id_str = path.split('/')[3]
                if not req_id_str.isdigit():
                    return self._send_error("Invalid request ID.", 400)
                req_id = int(req_id_str)

                cursor = conn.cursor()
                cursor.execute("SELECT * FROM blood_requests WHERE id = ?;", (req_id,))
                req = cursor.fetchone()
                if not req:
                    return self._send_error("Request not found.", 404)
                req_dict = dict(req)

                # Fetch matches
                cursor.execute("""
                    SELECT dm.*, d.blood_group, d.district, d.residential_area, d.total_donations_count,
                           u.full_name,
                           CASE WHEN dm.status = 'accepted' THEN u.phone ELSE '+92 3XX-XXXXXXX (Consented on Acceptance)' END as display_phone
                    FROM donor_matches dm
                    JOIN donors d ON dm.donor_id = d.id
                    JOIN users u ON d.user_id = u.id
                    WHERE dm.request_id = ?
                    ORDER BY dm.match_score DESC;
                """, (req_id,))
                req_dict['matches'] = [dict(r) for r in cursor.fetchall()]

                # Fetch reservations
                cursor.execute("""
                    SELECT ir.*, bb.official_name, bb.district as bank_district, bb.official_phone
                    FROM inventory_reservations ir
                    JOIN blood_banks bb ON ir.blood_bank_id = bb.id
                    WHERE ir.request_id = ?;
                """, (req_id,))
                req_dict['reservations'] = [dict(r) for r in cursor.fetchall()]

                self._send_json(req_dict)

            # Protected Donor routes
            elif path == '/api/donor/profile':
                if not user or user['role'] != 'donor':
                    return self._send_error("Donor access required.", 403)
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM donors WHERE user_id = ?;", (user['id'],))
                donor = cursor.fetchone()
                self._send_json(dict(donor) if donor else {})

            elif path == '/api/donor/incoming-requests':
                if not user or user['role'] != 'donor':
                    return self._send_error("Donor access required.", 403)
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM donors WHERE user_id = ?;", (user['id'],))
                d = cursor.fetchone()
                if not d:
                    return self._send_json([])

                donor_id = d['id']
                cursor.execute("""
                    SELECT br.*, dm.id as match_id, dm.match_score, dm.distance_km, dm.status as match_status
                    FROM donor_matches dm
                    JOIN blood_requests br ON dm.request_id = br.id
                    WHERE dm.donor_id = ?
                    ORDER BY dm.created_at DESC;
                """, (donor_id,))
                self._send_json([dict(r) for r in cursor.fetchall()])

            elif path == '/api/donor/donation-history':
                if not user or user['role'] != 'donor':
                    return self._send_error("Donor access required.", 403)
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM donors WHERE user_id = ?;", (user['id'],))
                d = cursor.fetchone()
                if not d:
                    return self._send_json([])
                cursor.execute("""
                    SELECT dh.*, bb.official_name as blood_bank_name
                    FROM donation_history dh
                    LEFT JOIN blood_banks bb ON dh.blood_bank_id = bb.id
                    WHERE dh.donor_id = ?
                    ORDER BY dh.donation_date DESC;
                """, (d['id'],))
                self._send_json([dict(r) for r in cursor.fetchall()])

            # Protected Blood Bank routes
            elif path == '/api/blood-bank/profile':
                if not user or user['role'] != 'blood_bank':
                    return self._send_error("Blood bank access required.", 403)
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT bb.*, p.name as package_name, p.commission_percent
                    FROM blood_banks bb
                    LEFT JOIN packages p ON bb.package_id = p.id
                    WHERE bb.user_id = ?;
                """, (user['id'],))
                bb = cursor.fetchone()
                self._send_json(dict(bb) if bb else {})

            elif path == '/api/blood-bank/inventory':
                if not user or user['role'] != 'blood_bank':
                    return self._send_error("Blood bank access required.", 403)
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM blood_banks WHERE user_id = ?;", (user['id'],))
                bb = cursor.fetchone()
                if not bb:
                    return self._send_error("Blood bank record not found.", 404)
                mgr = InventoryManager(conn)
                self._send_json(mgr.get_bank_inventory(bb['id']))

            elif path == '/api/blood-bank/requests':
                if not user or user['role'] != 'blood_bank':
                    return self._send_error("Blood bank access required.", 403)
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM blood_banks WHERE user_id = ?;", (user['id'],))
                bb = cursor.fetchone()
                if not bb:
                    return self._send_json([])

                # Find requests routed or reserved
                cursor.execute("""
                    SELECT br.*, ir.id as reservation_id, ir.status as reservation_status, ir.units_reserved
                    FROM blood_requests br
                    LEFT JOIN inventory_reservations ir ON br.id = ir.request_id AND ir.blood_bank_id = ?
                    WHERE br.status IN ('searching_blood_banks', 'blood_bank_confirmation', 'fulfilled')
                    ORDER BY br.created_at DESC;
                """, (bb['id'],))
                self._send_json([dict(r) for r in cursor.fetchall()])

            elif path == '/api/blood-bank/transactions':
                if not user or user['role'] != 'blood_bank':
                    return self._send_error("Blood bank access required.", 403)
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM blood_banks WHERE user_id = ?;", (user['id'],))
                bb = cursor.fetchone()
                if not bb:
                    return self._send_json([])
                cursor.execute("""
                    SELECT t.*, br.request_code, p.name as package_name
                    FROM transactions t
                    LEFT JOIN blood_requests br ON t.request_id = br.id
                    LEFT JOIN packages p ON t.package_id = p.id
                    WHERE t.blood_bank_id = ?
                    ORDER BY t.created_at DESC;
                """, (bb['id'],))
                self._send_json([dict(r) for r in cursor.fetchall()])

            # Notifications
            elif path == '/api/notifications':
                if not user:
                    return self._send_error("Authentication required.", 401)
                notif_sys = NotificationSystem(conn)
                self._send_json(notif_sys.get_user_notifications(user['id']))

            # Admin Endpoints
            elif path.startswith('/api/admin/'):
                if not user or user['role'] != 'admin':
                    return self._send_error("Administrator credentials required.", 403)

                if path == '/api/admin/overview':
                    cursor = conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM users;")
                    total_users = cursor.fetchone()[0]
                    cursor.execute("SELECT COUNT(*) FROM donors;")
                    total_donors = cursor.fetchone()[0]
                    cursor.execute("SELECT COUNT(*) FROM blood_banks;")
                    total_banks = cursor.fetchone()[0]
                    cursor.execute("SELECT COUNT(*) FROM blood_banks WHERE verification_status = 'pending';")
                    pending_banks = cursor.fetchone()[0]
                    cursor.execute("SELECT COUNT(*) FROM blood_requests;")
                    total_reqs = cursor.fetchone()[0]
                    cursor.execute("SELECT COUNT(*) FROM complaints WHERE status = 'open';")
                    open_complaints = cursor.fetchone()[0]
                    cursor.execute("SELECT COALESCE(SUM(commission_amount), 0) FROM transactions;")
                    total_commission = cursor.fetchone()[0]

                    self._send_json({
                        "total_users": total_users,
                        "total_donors": total_donors,
                        "total_blood_banks": total_banks,
                        "pending_blood_banks": pending_banks,
                        "total_requests": total_reqs,
                        "open_complaints": open_complaints,
                        "total_commission_earned": total_commission
                    })

                elif path == '/api/admin/users':
                    role_filter = params.get('role', [None])[0]
                    query = "SELECT id, email, role, full_name, phone, status, created_at FROM users WHERE 1=1"
                    args = []
                    if role_filter:
                        query += " AND role = ?"
                        args.append(role_filter)
                    query += " ORDER BY created_at DESC;"
                    cursor = conn.cursor()
                    cursor.execute(query, args)
                    self._send_json([dict(r) for r in cursor.fetchall()])

                elif path == '/api/admin/blood-banks':
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT bb.*, u.email as account_email, p.name as package_name, p.commission_percent
                        FROM blood_banks bb
                        JOIN users u ON bb.user_id = u.id
                        LEFT JOIN packages p ON bb.package_id = p.id
                        ORDER BY bb.created_at DESC;
                    """)
                    self._send_json([dict(r) for r in cursor.fetchall()])

                elif path == '/api/admin/requests':
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT br.*, u.full_name as requester_name, u.phone as requester_phone
                        FROM blood_requests br
                        JOIN users u ON br.requester_user_id = u.id
                        ORDER BY br.created_at DESC;
                    """)
                    self._send_json([dict(r) for r in cursor.fetchall()])

                elif path == '/api/admin/packages':
                    cursor = conn.cursor()
                    cursor.execute("SELECT * FROM packages ORDER BY price ASC;")
                    self._send_json([dict(r) for r in cursor.fetchall()])

                elif path == '/api/admin/districts':
                    cursor = conn.cursor()
                    cursor.execute("SELECT * FROM districts ORDER BY city ASC, name ASC;")
                    self._send_json([dict(r) for r in cursor.fetchall()])

                elif path == '/api/admin/screening-rules':
                    cursor = conn.cursor()
                    cursor.execute("SELECT * FROM medical_screening_rules ORDER BY id ASC;")
                    self._send_json([dict(r) for r in cursor.fetchall()])

                elif path == '/api/admin/compatibility-rules':
                    cursor = conn.cursor()
                    cursor.execute("SELECT * FROM compatibility_rules ORDER BY recipient_group ASC, clinical_priority ASC;")
                    self._send_json([dict(r) for r in cursor.fetchall()])

                elif path == '/api/admin/audit-logs':
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT al.*, u.email as user_email, u.role as user_role
                        FROM audit_logs al
                        LEFT JOIN users u ON al.user_id = u.id
                        ORDER BY al.created_at DESC LIMIT 100;
                    """)
                    self._send_json([dict(r) for r in cursor.fetchall()])

                elif path == '/api/admin/complaints':
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT c.*, u.email as user_email, u.full_name, u.role
                        FROM complaints c
                        JOIN users u ON c.user_id = u.id
                        ORDER BY c.created_at DESC;
                    """)
                    self._send_json([dict(r) for r in cursor.fetchall()])

                else:
                    self._send_error("Admin endpoint not found.", 404)

            else:
                self._send_error("API endpoint not found.", 404)

        except Exception as e:
            self._send_error(f"Internal server error: {str(e)}", 500)
        finally:
            conn.close()

    # ==================== POST REQUEST ROUTER ====================
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if not path.startswith('/api/'):
            return self._send_error("Not found", 404)

        conn = get_db()
        try:
            user = self._get_auth_user(conn)
            body = self._read_json_body()

            # 1. Register User (Requester, Donor, Blood Bank)
            if path == '/api/auth/register':
                role = body.get('role', '').strip().lower()
                email = body.get('email', '').strip().lower()
                password = body.get('password', '')
                full_name = body.get('full_name', '').strip()
                phone = body.get('phone', '').strip()

                if not email or not password or not full_name or not phone or role not in ['requester', 'donor', 'blood_bank']:
                    return self._send_error("Please supply all required registration fields.", 400)

                cursor = conn.cursor()
                cursor.execute("SELECT id FROM users WHERE email = ?;", (email,))
                if cursor.fetchone():
                    return self._send_error("An account with this email address already exists.", 400)

                pw_hash, pw_salt = hash_password(password)
                cursor.execute("""
                    INSERT INTO users (email, password_hash, password_salt, role, full_name, phone, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'active');
                """, (email, pw_hash, pw_salt, role, full_name, phone))
                user_id = cursor.lastrowid

                # Role-specific profile creation
                if role == 'donor':
                    dob = body.get('date_of_birth', '2000-01-01')
                    blood_group = body.get('blood_group', 'O+')
                    weight = float(body.get('weight_kg', 60.0))
                    city = body.get('city', 'Karachi')
                    district = body.get('district', 'South Karachi')
                    area = body.get('residential_area', '')
                    lat = float(body.get('latitude', 24.8607))
                    lng = float(body.get('longitude', 67.0011))
                    last_don = body.get('last_donation_date')

                    # Calculate age
                    birth_year = int(dob.split('-')[0])
                    age = 2026 - birth_year

                    # Check preliminary screening
                    screening_passed = 1 if (age >= 18 and weight >= 50.0) else 0

                    cursor.execute("""
                        INSERT INTO donors (
                            user_id, date_of_birth, age, gender, blood_group, weight_kg,
                            last_donation_date, city, district, residential_area, latitude, longitude,
                            availability_status, screening_passed, verified_status
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, 'verified');
                    """, (user_id, dob, age, body.get('gender', 'male'), blood_group, weight, last_don, city, district, area, lat, lng, screening_passed))

                elif role == 'blood_bank':
                    official_name = body.get('official_name', full_name)
                    license_no = body.get('license_number', f"BB-KHI-AUTO-{secrets.token_hex(3).upper()}")
                    district = body.get('district', 'East Karachi')
                    address = body.get('complete_address', 'Main Medical Boulevard, Karachi')
                    lat = float(body.get('latitude', 24.8700))
                    lng = float(body.get('longitude', 67.0400))
                    branches = int(body.get('branches_count', 1))

                    cursor.execute("""
                        INSERT INTO blood_banks (
                            user_id, official_name, license_number, contact_person, official_phone,
                            official_email, city, district, complete_address, latitude, longitude,
                            branches_count, verification_status, package_id
                        ) VALUES (?, ?, ?, ?, ?, ?, 'Karachi', ?, ?, ?, ?, ?, 'pending', 1);
                    """, (user_id, official_name, license_no, full_name, phone, email, district, address, lat, lng, branches))
                    bb_id = cursor.lastrowid

                    # Branch
                    cursor.execute("""
                        INSERT INTO blood_bank_branches (blood_bank_id, branch_name, branch_address, district, phone, latitude, longitude)
                        VALUES (?, 'Main Facility', ?, ?, ?, ?, ?);
                    """, (bb_id, address, district, phone, lat, lng))

                elif role == 'requester':
                    cursor.execute("""
                        INSERT INTO requesters (user_id, relationship_default, address, city, district)
                        VALUES (?, ?, ?, 'Karachi', ?);
                    """, (user_id, body.get('relationship', 'Self'), body.get('address', ''), body.get('district', 'South Karachi')))

                # Log audit
                cursor.execute("""
                    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details_json)
                    VALUES (?, 'USER_REGISTER', 'users', ?, ?);
                """, (user_id, user_id, f'{{"role": "{role}", "email": "{email}"}}'))

                conn.commit()

                # Generate session
                user_record = {
                    "id": user_id,
                    "email": email,
                    "role": role,
                    "full_name": full_name,
                    "status": "active"
                }
                token = create_session(user_record)
                self._send_json({
                    "success": True,
                    "message": "Registration successful.",
                    "token": token,
                    "user": user_record
                })

            # 2. Login
            elif path == '/api/auth/login':
                email = body.get('email', '')
                password = body.get('password', '')
                ok, auth_user, msg = authenticate_user(email, password, conn)
                if not ok:
                    return self._send_error(msg, 401)

                token = create_session(auth_user)
                # Audit log
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details_json)
                    VALUES (?, 'USER_LOGIN', 'users', ?, '{"method": "password"}');
                """, (auth_user['id'], auth_user['id']))
                conn.commit()

                self._send_json({
                    "success": True,
                    "message": msg,
                    "token": token,
                    "user": auth_user
                })

            # 3. Logout
            elif path == '/api/auth/logout':
                auth_header = self.headers.get('Authorization', '')
                if auth_header.startswith('Bearer '):
                    invalidate_session(auth_header[7:].strip())
                self._send_json({"success": True, "message": "Logged out successfully."})

            # 4. Create Blood Request (Requester Workflow)
            elif path == '/api/requests':
                if not user:
                    return self._send_error("Authentication required to submit blood request.", 401)

                patient_name = body.get('patient_name', '').strip()
                blood_group = body.get('blood_group', '').strip().upper()
                units = int(body.get('units_required', 1))
                urgency = body.get('urgency', 'urgent').lower()
                hosp_name = body.get('hospital_name', '').strip()
                hosp_addr = body.get('hospital_address', '').strip()
                district = body.get('district', 'South Karachi').strip()
                city = body.get('city', 'Karachi').strip()
                lat = float(body.get('latitude', 24.8607))
                lng = float(body.get('longitude', 67.0011))
                req_time = body.get('required_datetime') or datetime.now(timezone.utc).isoformat()
                notes = body.get('medical_notes', '')

                if not patient_name or not blood_group or units <= 0 or not hosp_name:
                    return self._send_error("Please supply patient name, blood group, bag quantity, and hospital name.", 400)

                # Generate unique code
                code = f"RBT-REQ-{datetime.now().year}-{secrets.token_hex(2).upper()}"

                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO blood_requests (
                        request_code, requester_user_id, patient_name, blood_group, units_required,
                        required_datetime, urgency, hospital_name, hospital_address, city, district,
                        latitude, longitude, medical_notes, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted');
                """, (code, user['id'], patient_name, blood_group, units, req_time, urgency, hosp_name, hosp_addr, city, district, lat, lng, notes))
                req_id = cursor.lastrowid
                conn.commit()

                # Trigger Intelligent Matching Engine
                matcher = MatchingEngine(conn)
                matches = matcher.find_matching_donors(req_id)

                # Send emergency notifications
                notif_sys = NotificationSystem(conn)
                notif_sys.broadcast_emergency_request(req_id, matches)

                # Notify requester
                notif_sys.send_notification(
                    user_id=user['id'],
                    title="Blood Request Submitted",
                    message=f"Request {code} has been registered. Our intelligent matching engine has notified {len(matches)} eligible donors in your area.",
                    notification_type='status_change',
                    reference_id=req_id,
                    reference_type='blood_request'
                )

                self._send_json({
                    "success": True,
                    "request_id": req_id,
                    "request_code": code,
                    "matched_donors_count": len(matches),
                    "matches": matches,
                    "message": f"Blood request {code} created successfully. Matching initiated."
                })

            # 5. Fallback to Blood Banks
            elif path.endswith('/fallback-to-banks'):
                parts = path.split('/')
                req_id = int(parts[3])
                matcher = MatchingEngine(conn)
                banks = matcher.search_blood_banks_fallback(req_id)
                self._send_json({
                    "success": True,
                    "blood_banks": banks,
                    "message": f"Found {len(banks)} verified blood banks with compatible inventory."
                })

            # 6. Cancel Request
            elif path.endswith('/cancel') and '/api/requests/' in path:
                parts = path.split('/')
                req_id = int(parts[3])
                reason = body.get('reason', 'Cancelled by requester.')
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE blood_requests 
                    SET status = 'cancelled', cancellation_reason = ?, updated_at = datetime('now', 'utc')
                    WHERE id = ?;
                """, (reason, req_id))
                conn.commit()
                self._send_json({"success": True, "message": "Request cancelled successfully."})

            # 7. Donor Responds to Request (Accept / Decline / Unavailable)
            elif path == '/api/donor/respond-request':
                if not user or user['role'] != 'donor':
                    return self._send_error("Donor access required.", 403)

                request_id = int(body.get('request_id', 0))
                action = body.get('action', '').lower() # 'accept', 'decline', 'unavailable'
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM donors WHERE user_id = ?;", (user['id'],))
                d = cursor.fetchone()
                if not d:
                    return self._send_error("Donor profile not found.", 404)
                donor_id = d['id']

                status_map = {
                    'accept': 'accepted',
                    'decline': 'declined',
                    'unavailable': 'unavailable'
                }
                new_status = status_map.get(action)
                if not new_status:
                    return self._send_error("Invalid response action.", 400)

                cursor.execute("""
                    UPDATE donor_matches 
                    SET status = ?, responded_at = datetime('now', 'utc')
                    WHERE request_id = ? AND donor_id = ?;
                """, (new_status, request_id, donor_id))

                if new_status == 'accepted':
                    cursor.execute("""
                        UPDATE blood_requests 
                        SET status = 'donor_response_received', updated_at = datetime('now', 'utc')
                        WHERE id = ? AND status IN ('donors_notified', 'searching_donors');
                    """, (request_id,))

                    # Notify requester
                    cursor.execute("SELECT requester_user_id, request_code FROM blood_requests WHERE id = ?;", (request_id,))
                    req = cursor.fetchone()
                    if req:
                        notif_sys = NotificationSystem(conn)
                        notif_sys.send_notification(
                            user_id=req['requester_user_id'],
                            title="Donor Confirmed!",
                            message=f"Verified donor {user['full_name']} has accepted your request {req['request_code']}! Transfusion coordination can proceed.",
                            notification_type='match_alert',
                            reference_id=request_id,
                            reference_type='blood_request'
                        )
                elif new_status == 'unavailable':
                    # Set donor unavailable
                    cursor.execute("UPDATE donors SET availability_status = 'temporarily_unavailable' WHERE id = ?;", (donor_id,))

                conn.commit()
                self._send_json({"success": True, "status": new_status, "message": f"Response recorded: {new_status}."})

            # 8. Blood Bank Inventory Addition
            elif path == '/api/blood-bank/inventory':
                if not user or user['role'] != 'blood_bank':
                    return self._send_error("Blood bank access required.", 403)
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM blood_banks WHERE user_id = ?;", (user['id'],))
                bb = cursor.fetchone()
                if not bb:
                    return self._send_error("Blood bank profile not found.", 404)

                mgr = InventoryManager(conn)
                res = mgr.add_inventory_batch(
                    blood_bank_id=bb['id'],
                    branch_id=body.get('branch_id'),
                    blood_group=body.get('blood_group'),
                    units=int(body.get('units', 1)),
                    collection_date=body.get('collection_date') or datetime.now().strftime('%Y-%m-%d'),
                    expiry_date=body.get('expiry_date') or datetime.now().strftime('%Y-%m-%d'),
                    batch_number=body.get('batch_number') or f"BTC-{secrets.token_hex(3).upper()}"
                )
                self._send_json(res)

            # 9. Blood Bank Reserves Units
            elif path == '/api/blood-bank/reserve':
                if not user or user['role'] != 'blood_bank':
                    return self._send_error("Blood bank access required.", 403)
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM blood_banks WHERE user_id = ?;", (user['id'],))
                bb = cursor.fetchone()
                if not bb:
                    return self._send_error("Blood bank profile not found.", 404)

                req_id = int(body.get('request_id', 0))
                blood_group = body.get('blood_group', '')
                units = int(body.get('units', 1))
                notes = body.get('notes', '')

                mgr = InventoryManager(conn)
                res = mgr.reserve_units(req_id, bb['id'], blood_group, units, notes)
                if not res['success']:
                    return self._send_error(res['message'], 400)
                self._send_json(res)

            # 10. Blood Bank Dispenses Units (Fulfill)
            elif path == '/api/blood-bank/dispense':
                if not user or user['role'] != 'blood_bank':
                    return self._send_error("Blood bank access required.", 403)
                res_id = int(body.get('reservation_id', 0))
                mgr = InventoryManager(conn)
                res = mgr.dispense_and_fulfill(res_id, user['id'])
                if not res['success']:
                    return self._send_error(res['message'], 400)
                self._send_json(res)

            # 11. Blood Bank Subscribes / Changes Package
            elif path == '/api/blood-bank/subscribe':
                if not user or user['role'] != 'blood_bank':
                    return self._send_error("Blood bank access required.", 403)
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM blood_banks WHERE user_id = ?;", (user['id'],))
                bb = cursor.fetchone()
                pkg_id = int(body.get('package_id', 2))
                cursor.execute("UPDATE blood_banks SET package_id = ? WHERE id = ?;", (pkg_id, bb['id']))
                conn.commit()
                self._send_json({"success": True, "message": "Subscription package updated."})

            # 12. Submit Complaint / Dispute
            elif path == '/api/complaints':
                if not user:
                    return self._send_error("Authentication required.", 401)
                subject = body.get('subject', '').strip()
                desc = body.get('description', '').strip()
                if not subject or not desc:
                    return self._send_error("Please supply subject and description.", 400)

                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO complaints (user_id, subject, description, status)
                    VALUES (?, ?, ?, 'open');
                """, (user['id'], subject, desc))
                conn.commit()
                self._send_json({"success": True, "message": "Dispute submitted to administration."})

            # 13. Admin Adds District
            elif path == '/api/admin/districts':
                if not user or user['role'] != 'admin':
                    return self._send_error("Admin access required.", 403)
                name = body.get('name', '').strip()
                city = body.get('city', 'Karachi').strip()
                cursor = conn.cursor()
                cursor.execute("INSERT OR IGNORE INTO districts (name, city) VALUES (?, ?);", (name, city))
                conn.commit()
                self._send_json({"success": True, "message": f"District {name} added."})

            else:
                self._send_error("POST endpoint not found.", 404)

        except Exception as e:
            self._send_error(f"Internal server error: {str(e)}", 500)
        finally:
            conn.close()

    # ==================== PUT REQUEST ROUTER ====================
    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if not path.startswith('/api/'):
            return self._send_error("Not found", 404)

        conn = get_db()
        try:
            user = self._get_auth_user(conn)
            body = self._read_json_body()

            # Donor Availability Toggle
            if path == '/api/donor/availability':
                if not user or user['role'] != 'donor':
                    return self._send_error("Donor access required.", 403)
                new_status = body.get('status', 'available')
                if new_status not in ['available', 'temporarily_unavailable', 'not_accepting']:
                    return self._send_error("Invalid status value.", 400)

                cursor = conn.cursor()
                cursor.execute("UPDATE donors SET availability_status = ? WHERE user_id = ?;", (new_status, user['id']))
                conn.commit()
                self._send_json({"success": True, "status": new_status, "message": f"Availability updated to {new_status}."})

            # Donor Profile Update
            elif path == '/api/donor/profile':
                if not user or user['role'] != 'donor':
                    return self._send_error("Donor access required.", 403)
                weight = float(body.get('weight_kg', 60.0))
                area = body.get('residential_area', '')
                district = body.get('district', 'South Karachi')
                hide_phone = 1 if body.get('privacy_hide_phone') else 0

                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE donors 
                    SET weight_kg = ?, residential_area = ?, district = ?, privacy_hide_phone = ?
                    WHERE user_id = ?;
                """, (weight, area, district, hide_phone, user['id']))
                conn.commit()
                self._send_json({"success": True, "message": "Donor profile updated successfully."})

            # Blood Bank Inventory Unit Update
            elif path.startswith('/api/blood-bank/inventory/'):
                if not user or user['role'] != 'blood_bank':
                    return self._send_error("Blood bank access required.", 403)
                inv_id = int(path.split('/')[4])
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM blood_banks WHERE user_id = ?;", (user['id'],))
                bb = cursor.fetchone()
                units = int(body.get('available_units', 0))

                mgr = InventoryManager(conn)
                res = mgr.update_inventory_units(inv_id, bb['id'], units)
                self._send_json(res)

            # Notifications: Mark Single as Read
            elif path.startswith('/api/notifications/') and path.endswith('/read'):
                if not user:
                    return self._send_error("Authentication required.", 401)
                notif_id = int(path.split('/')[3])
                notif_sys = NotificationSystem(conn)
                notif_sys.mark_as_read(notif_id, user['id'])
                self._send_json({"success": True})

            # Notifications: Mark All as Read
            elif path == '/api/notifications/read-all':
                if not user:
                    return self._send_error("Authentication required.", 401)
                notif_sys = NotificationSystem(conn)
                notif_sys.mark_all_as_read(user['id'])
                self._send_json({"success": True})

            # Admin: Verify/Reject Blood Bank
            elif path.startswith('/api/admin/blood-banks/') and path.endswith('/verify'):
                if not user or user['role'] != 'admin':
                    return self._send_error("Admin access required.", 403)
                bb_id = int(path.split('/')[4])
                new_status = body.get('status', 'verified') # 'verified', 'rejected', 'suspended'
                cursor = conn.cursor()
                cursor.execute("UPDATE blood_banks SET verification_status = ? WHERE id = ?;", (new_status, bb_id))

                # Notify blood bank
                cursor.execute("SELECT user_id, official_name FROM blood_banks WHERE id = ?;", (bb_id,))
                bb = cursor.fetchone()
                if bb:
                    notif_sys = NotificationSystem(conn)
                    notif_sys.send_notification(
                        user_id=bb['user_id'],
                        title=f"Verification Status: {new_status.title()}",
                        message=f"Your blood bank account '{bb['official_name']}' has been updated to '{new_status}' by platform administration.",
                        notification_type='verification'
                    )

                conn.commit()
                self._send_json({"success": True, "message": f"Blood bank status updated to {new_status}."})

            # Admin: Update User Status (Suspend / Activate)
            elif path.startswith('/api/admin/users/') and path.endswith('/status'):
                if not user or user['role'] != 'admin':
                    return self._send_error("Admin access required.", 403)
                u_id = int(path.split('/')[4])
                new_status = body.get('status', 'active')
                cursor = conn.cursor()
                cursor.execute("UPDATE users SET status = ? WHERE id = ?;", (new_status, u_id))
                conn.commit()
                self._send_json({"success": True, "message": f"User status updated to {new_status}."})

            # Admin: Update Package Pricing & Commission %
            elif path.startswith('/api/admin/packages/'):
                if not user or user['role'] != 'admin':
                    return self._send_error("Admin access required.", 403)
                pkg_id = int(path.split('/')[4])
                price = float(body.get('price', 0.0))
                comm_pct = float(body.get('commission_percent', 5.0))
                cursor = conn.cursor()
                cursor.execute("UPDATE packages SET price = ?, commission_percent = ? WHERE id = ?;", (price, comm_pct, pkg_id))
                conn.commit()
                self._send_json({"success": True, "message": "Package pricing and commission updated."})

            # Admin: Update Screening Rule
            elif path.startswith('/api/admin/screening-rules/'):
                if not user or user['role'] != 'admin':
                    return self._send_error("Admin access required.", 403)
                rule_id = int(path.split('/')[4])
                min_v = float(body.get('min_value', 0.0))
                max_v = float(body.get('max_value', 100.0))
                active = 1 if body.get('is_active') else 0
                cursor = conn.cursor()
                cursor.execute("UPDATE medical_screening_rules SET min_value = ?, max_value = ?, is_active = ? WHERE id = ?;", (min_v, max_v, active, rule_id))
                conn.commit()
                self._send_json({"success": True, "message": "Screening rule updated."})

            # Admin: Resolve Complaint
            elif path.startswith('/api/admin/complaints/'):
                if not user or user['role'] != 'admin':
                    return self._send_error("Admin access required.", 403)
                comp_id = int(path.split('/')[4])
                status = body.get('status', 'resolved')
                notes = body.get('resolution_notes', 'Resolved by administration.')
                cursor = conn.cursor()
                cursor.execute("UPDATE complaints SET status = ?, resolution_notes = ? WHERE id = ?;", (status, notes, comp_id))
                conn.commit()
                self._send_json({"success": True, "message": "Complaint status updated."})

            else:
                self._send_error("PUT endpoint not found.", 404)

        except Exception as e:
            self._send_error(f"Internal server error: {str(e)}", 500)
        finally:
            conn.close()

def run_server():
    init_db()
    port = PORT
    httpd = None
    for p in [port, 8081, 8082, 3000, 5000]:
        try:
            server_address = ('0.0.0.0', p)
            httpd = ThreadingHTTPServer(server_address, RabtaRequestHandler)
            port = p
            break
        except OSError:
            continue

    if not httpd:
        raise RuntimeError("Could not bind to any suitable port.")

    print(f"==================================================", flush=True)
    print(f"  RABTA Blood Donation Platform Server Started", flush=True)
    print(f"  Brand: RABTA - Connecting Lives. One Donation at a Time.", flush=True)
    print(f"  Listening on: http://localhost:{port}", flush=True)
    print(f"==================================================", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server cleanly...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
