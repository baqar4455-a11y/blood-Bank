"""
RABTA Emergency Notification & Communication System
Handles In-App notification dispatch, emergency donor alerts,
SMS & Email provider abstractions, and response tracking.
"""

import os
import sqlite3
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

class NotificationSystem:
    def __init__(self, db_conn: sqlite3.Connection):
        self.conn = db_conn
        # Environmental configuration for live SMS & Email gateways
        self.smtp_host = os.environ.get("RABTA_SMTP_HOST", "smtp.sendgrid.net")
        self.sms_api_key = os.environ.get("RABTA_SMS_KEY", "")

    def send_notification(self, user_id: int, title: str, message: str,
                          notification_type: str = 'system',
                          reference_id: Optional[int] = None,
                          reference_type: Optional[str] = None) -> int:
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO notifications (user_id, title, message, notification_type, reference_id, reference_type, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now', 'utc'));
        """, (user_id, title, message, notification_type, reference_id, reference_type))
        notif_id = cursor.lastrowid
        self.conn.commit()

        # Simulate or dispatch external notification (SMS/Email)
        self._dispatch_external_channel(user_id, title, message, notification_type)
        return notif_id

    def _dispatch_external_channel(self, user_id: int, title: str, message: str, notification_type: str):
        """Simulates external SMS/Email gateway dispatch while logging to system audit."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT email, phone, full_name FROM users WHERE id = ?;", (user_id,))
        user = cursor.fetchone()
        if not user:
            return

        # Audit log for external dispatch attempt
        channel = "SMS + EMAIL" if notification_type == 'emergency' else "IN-APP"
        cursor.execute("""
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details_json)
            VALUES (?, 'DISPATCH_NOTIFICATION', 'notifications', NULL, ?);
        """, (user_id, f'{{"recipient": "{user["email"]}", "phone": "{user["phone"]}", "channel": "{channel}", "type": "{notification_type}"}}'))
        self.conn.commit()

    def broadcast_emergency_request(self, request_id: int, matched_donors: List[Dict[str, Any]]) -> int:
        """Sends immediate high-priority emergency alerts to all matched compatible donors."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM blood_requests WHERE id = ?;", (request_id,))
        req = cursor.fetchone()
        if not req:
            return 0
        req = dict(req)

        dispatched_count = 0
        for m in matched_donors:
            donor_user_id = m['user_id']
            title = f"🚨 URGENT: {req['blood_group']} Blood Needed Nearby!"
            message = (
                f"Emergency patient at {req['hospital_name']} ({req['district']}) urgently requires "
                f"{req['units_required']} bag(s) of {req['blood_group']} blood. "
                f"Approx distance: {m['distance_km']} km. Please respond immediately."
            )
            self.send_notification(
                user_id=donor_user_id,
                title=title,
                message=message,
                notification_type='emergency',
                reference_id=request_id,
                reference_type='blood_request'
            )
            dispatched_count += 1

        return dispatched_count

    def get_user_notifications(self, user_id: int, limit: int = 30) -> List[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?;
        """, (user_id, limit))
        return [dict(r) for r in cursor.fetchall()]

    def mark_as_read(self, notification_id: int, user_id: int) -> bool:
        cursor = self.conn.cursor()
        cursor.execute("""
            UPDATE notifications 
            SET is_read = 1 
            WHERE id = ? AND user_id = ?;
        """, (notification_id, user_id))
        self.conn.commit()
        return cursor.rowcount > 0

    def mark_all_as_read(self, user_id: int) -> bool:
        cursor = self.conn.cursor()
        cursor.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?;", (user_id,))
        self.conn.commit()
        return True
