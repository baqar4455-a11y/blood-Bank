"""
RABTA Blood Donation Platform - Automated Test Suite
Runs end-to-end integration, algorithmic, and security verification.
"""

import unittest
import sqlite3
import os
import json
import threading
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer
from urllib.request import urlopen

from database import init_db, get_db, hash_password
from auth import authenticate_user, create_session, get_current_user_from_token
from matching_engine import MatchingEngine, haversine_distance
from inventory_manager import InventoryManager
from notifications import NotificationSystem
from app import RabtaRequestHandler, _parse_request_target

class RabtaPlatformTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.conn = get_db()

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()

    def test_vercel_rewrite_preserves_original_api_path_and_query(self):
        path, params = _parse_request_target(
            "/api/index.py?__vercel_path=/api/blood-banks/verified&city=Karachi"
        )
        self.assertEqual(path, "/api/blood-banks/verified")
        self.assertEqual(params, {"city": ["Karachi"]})

        path, params = _parse_request_target(
            "/api/auth/me?__vercel_path=/api/ignored"
        )
        self.assertEqual(path, "/api/auth/me")
        self.assertEqual(params, {"__vercel_path": ["/api/ignored"]})

    def test_vercel_static_rewrite_destinations_serve_assets(self):
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        with open(os.path.join(project_root, "vercel.json"), encoding="utf-8") as file:
            rewrites = json.load(file)["rewrites"]
        destinations = {rewrite["source"]: rewrite["destination"] for rewrite in rewrites}

        static_routes = [
            (destinations["/css/(.*)"].replace("$1", "styles.css"), "text/css", "--bg-dark"),
            (destinations["/js/(.*)"].replace("$1", "app.js"), "javascript", "const App"),
            (destinations["/(.*)"], "text/html", 'href="css/styles.css"'),
        ]
        server = ThreadingHTTPServer(("127.0.0.1", 0), RabtaRequestHandler)
        server_thread = threading.Thread(target=server.serve_forever, daemon=True)
        server_thread.start()
        try:
            for path, content_type, marker in static_routes:
                with self.subTest(path=path), urlopen(
                    f"http://127.0.0.1:{server.server_port}{path}"
                ) as response:
                    body = response.read().decode("utf-8")
                    self.assertIn(content_type, response.headers.get_content_type())
                    self.assertIn(marker, body)
        finally:
            server.shutdown()
            server.server_close()
            server_thread.join()

    def test_01_haversine_distance(self):
        """Test accurate great-circle distance calculation."""
        # Distance between Clifton (24.8198, 67.0275) and NICH Hospital (24.8512, 67.0435) ~ 3.8 km
        dist = haversine_distance(24.8198, 67.0275, 24.8512, 67.0435)
        self.assertGreater(dist, 3.0)
        self.assertLess(dist, 5.0)

    def test_02_blood_compatibility_matrix(self):
        """Test ABO/Rh compatibility rules from database."""
        matcher = MatchingEngine(self.conn)

        # O- can only receive O-
        compat_o_neg = [r['donor_group'] for r in matcher.get_compatible_groups('O-')]
        self.assertEqual(compat_o_neg, ['O-'])

        # O+ can receive O+ and O-
        compat_o_pos = [r['donor_group'] for r in matcher.get_compatible_groups('O+')]
        self.assertIn('O+', compat_o_pos)
        self.assertIn('O-', compat_o_pos)

        # AB+ (universal recipient) can receive all 8 groups
        compat_ab_pos = [r['donor_group'] for r in matcher.get_compatible_groups('AB+')]
        self.assertEqual(len(compat_ab_pos), 8)

    def test_03_medical_eligibility_screening(self):
        """Test preliminary medical eligibility constraints."""
        matcher = MatchingEngine(self.conn)

        # Underage donor
        underage_donor = {'age': 16, 'weight_kg': 60, 'last_donation_date': None, 'screening_passed': 1}
        ok, flags = matcher.check_medical_eligibility(underage_donor)
        self.assertFalse(ok)
        self.assertTrue(any('Age 16' in f for f in flags))

        # Underweight donor
        underweight_donor = {'age': 25, 'weight_kg': 44, 'last_donation_date': None, 'screening_passed': 1}
        ok, flags = matcher.check_medical_eligibility(underweight_donor)
        self.assertFalse(ok)
        self.assertTrue(any('Weight 44kg is below safe minimum' in f for f in flags))

        # Eligible donor
        eligible_donor = {'age': 28, 'weight_kg': 65, 'last_donation_date': '2025-01-01', 'screening_passed': 1}
        ok, flags = matcher.check_medical_eligibility(eligible_donor)
        self.assertTrue(ok)
        self.assertEqual(len(flags), 0)

    def test_04_admin_authentication(self):
        """Test secure admin login and RBAC verification."""
        ok, user, msg = authenticate_user('admin@rabta.pk', 'Admin@12345', self.conn)
        self.assertTrue(ok)
        self.assertEqual(user['role'], 'admin')

        token = create_session(user)
        self.assertTrue(len(token) > 20)

        verified_user = get_current_user_from_token(token, self.conn)
        self.assertIsNotNone(verified_user)
        self.assertEqual(verified_user['email'], 'admin@rabta.pk')

    def test_05_intelligent_matching_algorithm(self):
        """Test request creation and automated donor matching."""
        import secrets
        cursor = self.conn.cursor()
        cursor.execute("SELECT id FROM users WHERE role = 'requester' LIMIT 1;")
        req_user_id = cursor.fetchone()[0]

        test_code = f"RBT-TEST-{secrets.token_hex(4).upper()}"
        # Create emergency request for B+
        cursor.execute("""
            INSERT INTO blood_requests (
                request_code, requester_user_id, patient_name, blood_group, units_required,
                required_datetime, urgency, hospital_name, hospital_address, city, district,
                latitude, longitude, medical_notes, status
            ) VALUES (
                ?, ?, 'Test Emergency Patient', 'B+', 1,
                datetime('now', '+2 hours'), 'emergency', 'Liaquat National Hospital',
                'Stadium Road, Karachi', 'Karachi', 'East Karachi',
                24.8932, 67.0712, 'Trauma emergency.', 'submitted'
            );
        """, (test_code, req_user_id))
        req_id = cursor.lastrowid
        self.conn.commit()

        self.__class__.sample_test_req_id = req_id

        matcher = MatchingEngine(self.conn)
        matches = matcher.find_matching_donors(req_id)
        self.assertGreater(len(matches), 0)

        # Check top match compatibility
        top_match = matches[0]
        self.assertIn(top_match['blood_group'], ['B+', 'B-', 'O+', 'O-'])
        self.assertGreater(top_match['match_score'], 0)

    def test_06_blood_bank_fallback_search(self):
        """Test automatic blood bank fallback search when donors are needed."""
        req_id = getattr(self.__class__, 'sample_test_req_id', None)
        if not req_id:
            cursor = self.conn.cursor()
            cursor.execute("SELECT id FROM blood_requests ORDER BY id DESC LIMIT 1;")
            req_id = cursor.fetchone()[0]

        matcher = MatchingEngine(self.conn)
        banks = matcher.search_blood_banks_fallback(req_id)
        self.assertGreater(len(banks), 0)
        first_bank = banks[0]
        self.assertIn('official_name', first_bank)
        self.assertIn('compatible_stock', first_bank)
        self.assertGreater(first_bank['total_available_units'], 0)

    def test_07_inventory_atomic_reservation_and_dispense(self):
        """Test atomic stock reservation, preventing negative inventory, and dispensing."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT id, blood_bank_id, available_units FROM blood_inventory WHERE blood_group = 'B+' AND available_units >= 2 LIMIT 1;")
        inv = cursor.fetchone()
        inv_id, bb_id, initial_stock = inv[0], inv[1], inv[2]

        req_id = getattr(self.__class__, 'sample_test_req_id', None)
        if not req_id:
            cursor.execute("SELECT id FROM blood_requests ORDER BY id DESC LIMIT 1;")
            req_id = cursor.fetchone()[0]

        mgr = InventoryManager(self.conn)
        # 1. Reserve 1 unit
        res = mgr.reserve_units(req_id, bb_id, 'B+', 1, "Urgent trauma allocation")
        self.assertTrue(res['success'])
        res_id = res['reservation_id']

        # Verify stock decremented
        cursor.execute("SELECT available_units, reserved_units FROM blood_inventory WHERE id = ?;", (inv_id,))
        updated_inv = cursor.fetchone()
        self.assertEqual(updated_inv['available_units'], initial_stock - 1)
        self.assertEqual(updated_inv['reserved_units'], 1)

        # 2. Dispense and Fulfill
        disp_res = mgr.dispense_and_fulfill(res_id, user_id=1)
        self.assertTrue(disp_res['success'])

        # Verify request status is fulfilled
        cursor.execute("SELECT status FROM blood_requests WHERE id = ?;", (req_id,))
        self.assertEqual(cursor.fetchone()[0], 'fulfilled')

        # Verify transaction logged
        cursor.execute("SELECT commission_amount FROM transactions WHERE request_id = ?;", (req_id,))
        t = cursor.fetchone()
        self.assertIsNotNone(t)
        self.assertGreater(t[0], 0)

    def test_08_notification_system(self):
        """Test in-app notification dispatch and unread count."""
        notif_sys = NotificationSystem(self.conn)
        notif_id = notif_sys.send_notification(
            user_id=1,
            title="Unit Test Notification",
            message="This is a test notification from the RABTA test suite.",
            notification_type="system"
        )
        self.assertIsNotNone(notif_id)

        notifs = notif_sys.get_user_notifications(user_id=1)
        self.assertGreater(len(notifs), 0)
        self.assertEqual(notifs[0]['title'], "Unit Test Notification")

        # Mark as read
        ok = notif_sys.mark_as_read(notif_id, user_id=1)
        self.assertTrue(ok)

if __name__ == '__main__':
    unittest.main()
