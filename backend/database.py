"""
RABTA Blood Donation Platform - Database Schema and Connection Manager
Official Brand: RABTA
Tagline: Connecting Lives. One Donation at a Time.
"""

import sqlite3
import os
import shutil
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

DEFAULT_LOCAL_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rabta.db")
if os.environ.get("VERCEL"):
    DB_PATH = "/tmp/rabta.db"
    if not os.path.exists(DB_PATH) and os.path.exists(DEFAULT_LOCAL_DB):
        try:
            shutil.copyfile(DEFAULT_LOCAL_DB, DB_PATH)
        except Exception as e:
            print(f"Error copying seed database to /tmp: {e}")
else:
    DB_PATH = os.environ.get("RABTA_DB_PATH", DEFAULT_LOCAL_DB)

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return dk.hex(), salt

def verify_password(password: str, hashed: str, salt: str) -> bool:
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return hmac_compare(dk.hex(), hashed)

def hmac_compare(a: str, b: str) -> bool:
    import hmac
    return hmac.compare_digest(a, b)

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
    -- 1. Users Table
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('requester', 'donor', 'blood_bank', 'admin')),
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'pending_verification')),
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
    );

    -- 2. Requesters Profile Table
    CREATE TABLE IF NOT EXISTS requesters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        relationship_default TEXT DEFAULT 'Self',
        address TEXT,
        city TEXT DEFAULT 'Karachi',
        district TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 3. Donors Profile Table
    CREATE TABLE IF NOT EXISTS donors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        date_of_birth TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT CHECK(gender IN ('male', 'female', 'other')),
        blood_group TEXT NOT NULL CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
        weight_kg REAL NOT NULL,
        last_donation_date TEXT,
        city TEXT DEFAULT 'Karachi',
        district TEXT NOT NULL,
        residential_area TEXT,
        latitude REAL,
        longitude REAL,
        availability_status TEXT NOT NULL DEFAULT 'available' CHECK(availability_status IN ('available', 'temporarily_unavailable', 'not_accepting')),
        screening_passed INTEGER DEFAULT 1,
        screening_notes TEXT,
        verified_status TEXT NOT NULL DEFAULT 'verified' CHECK(verified_status IN ('pending', 'verified', 'rejected')),
        privacy_hide_phone INTEGER DEFAULT 0,
        privacy_approx_distance INTEGER DEFAULT 1,
        total_donations_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 4. Blood Banks Table
    CREATE TABLE IF NOT EXISTS blood_banks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        official_name TEXT NOT NULL,
        license_number TEXT UNIQUE NOT NULL,
        contact_person TEXT NOT NULL,
        official_phone TEXT NOT NULL,
        official_email TEXT NOT NULL,
        city TEXT DEFAULT 'Karachi',
        district TEXT NOT NULL,
        complete_address TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        branches_count INTEGER DEFAULT 1,
        verification_status TEXT NOT NULL DEFAULT 'verified' CHECK(verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
        package_id INTEGER DEFAULT 2,
        documents_ref TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 5. Blood Bank Branches Table
    CREATE TABLE IF NOT EXISTS blood_bank_branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        blood_bank_id INTEGER NOT NULL,
        branch_name TEXT NOT NULL,
        branch_address TEXT NOT NULL,
        district TEXT NOT NULL,
        phone TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (blood_bank_id) REFERENCES blood_banks(id) ON DELETE CASCADE
    );

    -- 6. Blood Inventory Table
    CREATE TABLE IF NOT EXISTS blood_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        blood_bank_id INTEGER NOT NULL,
        branch_id INTEGER,
        blood_group TEXT NOT NULL CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
        available_units INTEGER NOT NULL DEFAULT 0 CHECK(available_units >= 0),
        reserved_units INTEGER NOT NULL DEFAULT 0 CHECK(reserved_units >= 0),
        collection_date TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        batch_number TEXT NOT NULL,
        verification_status TEXT DEFAULT 'confirmed' CHECK(verification_status IN ('confirmed', 'quarantined', 'expired')),
        last_updated TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (blood_bank_id) REFERENCES blood_banks(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES blood_bank_branches(id) ON DELETE SET NULL
    );

    -- 7. Blood Requests Table
    CREATE TABLE IF NOT EXISTS blood_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_code TEXT UNIQUE NOT NULL,
        requester_user_id INTEGER NOT NULL,
        patient_name TEXT NOT NULL,
        blood_group TEXT NOT NULL CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
        units_required INTEGER NOT NULL CHECK(units_required > 0),
        required_datetime TEXT NOT NULL,
        urgency TEXT NOT NULL DEFAULT 'urgent' CHECK(urgency IN ('normal', 'urgent', 'emergency')),
        hospital_name TEXT NOT NULL,
        hospital_address TEXT NOT NULL,
        city TEXT DEFAULT 'Karachi',
        district TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        medical_notes TEXT,
        documentation_ref TEXT,
        status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN (
            'submitted',
            'verification_pending',
            'searching_donors',
            'donors_notified',
            'donor_response_received',
            'searching_blood_banks',
            'blood_bank_confirmation',
            'fulfilled',
            'cancelled'
        )),
        cancellation_reason TEXT,
        fulfilled_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 8. Donor Matches (Responses) Table
    CREATE TABLE IF NOT EXISTS donor_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL,
        donor_id INTEGER NOT NULL,
        match_score REAL NOT NULL,
        distance_km REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'notified' CHECK(status IN ('notified', 'accepted', 'declined', 'unavailable', 'expired')),
        responded_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
        UNIQUE(request_id, donor_id)
    );

    -- 9. Inventory Reservations Table
    CREATE TABLE IF NOT EXISTS inventory_reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL,
        blood_bank_id INTEGER NOT NULL,
        inventory_id INTEGER,
        blood_group TEXT NOT NULL,
        units_reserved INTEGER NOT NULL CHECK(units_reserved > 0),
        status TEXT NOT NULL DEFAULT 'pending_approval' CHECK(status IN ('pending_approval', 'confirmed', 'dispensed', 'cancelled', 'released')),
        reservation_notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (blood_bank_id) REFERENCES blood_banks(id) ON DELETE CASCADE,
        FOREIGN KEY (inventory_id) REFERENCES blood_inventory(id) ON DELETE SET NULL
    );

    -- 10. Donation History Table
    CREATE TABLE IF NOT EXISTS donation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        donor_id INTEGER NOT NULL,
        blood_bank_id INTEGER,
        request_id INTEGER,
        donation_date TEXT NOT NULL,
        units_donated INTEGER NOT NULL DEFAULT 1,
        blood_group TEXT NOT NULL,
        verified_by_user_id INTEGER,
        facility_name TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
        FOREIGN KEY (blood_bank_id) REFERENCES blood_banks(id) ON DELETE SET NULL,
        FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE SET NULL
    );

    -- 11. Blood Bank Packages Table
    CREATE TABLE IF NOT EXISTS packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        price REAL NOT NULL DEFAULT 0.0,
        commission_percent REAL NOT NULL DEFAULT 0.0,
        description TEXT NOT NULL,
        features_json TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
    );

    -- 12. Subscriptions Table
    CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        blood_bank_id INTEGER NOT NULL,
        package_id INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expired', 'cancelled', 'trial')),
        billing_cycle TEXT DEFAULT 'monthly',
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (blood_bank_id) REFERENCES blood_banks(id) ON DELETE CASCADE,
        FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
    );

    -- 13. Transactions Table
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        blood_bank_id INTEGER NOT NULL,
        request_id INTEGER,
        package_id INTEGER,
        amount REAL NOT NULL DEFAULT 0.0,
        commission_amount REAL NOT NULL DEFAULT 0.0,
        transaction_type TEXT NOT NULL CHECK(transaction_type IN ('service_fee', 'subscription', 'coordination_support')),
        status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (blood_bank_id) REFERENCES blood_banks(id) ON DELETE CASCADE,
        FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE SET NULL
    );

    -- 14. Notifications Table
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        notification_type TEXT NOT NULL CHECK(notification_type IN ('emergency', 'match_alert', 'status_change', 'verification', 'system')),
        reference_id INTEGER,
        reference_type TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 15. Districts Table
    CREATE TABLE IF NOT EXISTS districts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        city TEXT NOT NULL DEFAULT 'Karachi',
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        UNIQUE(name, city)
    );

    -- 16. Cities Table
    CREATE TABLE IF NOT EXISTS cities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        province TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
    );

    -- 17. Medical Screening Rules Table
    CREATE TABLE IF NOT EXISTS medical_screening_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_name TEXT UNIQUE NOT NULL,
        rule_category TEXT NOT NULL,
        min_value REAL,
        max_value REAL,
        description TEXT NOT NULL,
        error_message TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
    );

    -- 18. Blood Compatibility Rules Table
    CREATE TABLE IF NOT EXISTS compatibility_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient_group TEXT NOT NULL,
        donor_group TEXT NOT NULL,
        is_compatible INTEGER NOT NULL DEFAULT 1,
        clinical_priority INTEGER NOT NULL DEFAULT 1, -- 1 = Exact match, 2 = Universal/Compatible
        UNIQUE(recipient_group, donor_group)
    );

    -- 19. Audit Logs Table
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        details_json TEXT,
        ip_address TEXT DEFAULT '127.0.0.1',
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
    );

    -- 20. Complaints & Disputes Table
    CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'investigating', 'resolved', 'dismissed')),
        resolution_notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_requests_status ON blood_requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_group ON blood_requests(blood_group);
    CREATE INDEX IF NOT EXISTS idx_donors_group_avail ON donors(blood_group, availability_status);
    CREATE INDEX IF NOT EXISTS idx_inventory_group ON blood_inventory(blood_group, available_units);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    """)

    conn.commit()
    seed_initial_data(conn)
    conn.close()
    print("Database initialized and verified successfully.")

def seed_initial_data(conn: sqlite3.Connection):
    cursor = conn.cursor()

    # Check if already seeded
    cursor.execute("SELECT COUNT(*) FROM users;")
    if cursor.fetchone()[0] > 0:
        return

    print("Seeding initial reference data, rules, demo accounts, and Karachi centers...")

    # 1. Cities
    cities = [
        ('Karachi', 'Sindh'),
        ('Lahore', 'Punjab'),
        ('Islamabad', 'Federal Capital'),
        ('Rawalpindi', 'Punjab'),
        ('Peshawar', 'Khyber Pakhtunkhwa'),
        ('Quetta', 'Balochistan'),
        ('Faisalabad', 'Punjab'),
        ('Hyderabad', 'Sindh')
    ]
    cursor.executemany("INSERT OR IGNORE INTO cities (name, province) VALUES (?, ?);", cities)

    # 2. Karachi Districts
    karachi_districts = [
        ('Malir', 'Karachi'),
        ('Korangi', 'Karachi'),
        ('East Karachi', 'Karachi'),
        ('South Karachi', 'Karachi'),
        ('Central Karachi', 'Karachi'),
        ('West Karachi', 'Karachi'),
        ('Keamari', 'Karachi')
    ]
    cursor.executemany("INSERT OR IGNORE INTO districts (name, city) VALUES (?, ?);", karachi_districts)

    # 3. Medical Screening Rules
    screening_rules = [
        ('donor_minimum_age', 'age', 18.0, 65.0, 'Donor must be between 18 and 65 years old', 'Donor must be at least 18 years of age and under 65.', 1),
        ('donor_minimum_weight', 'weight', 50.0, 250.0, 'Donor body weight in kilograms must be >= 50 kg', 'Donor must weigh at least 50 kg for whole blood donation.', 1),
        ('donation_interval_days', 'interval', 90.0, 9999.0, 'Minimum 90 days required between whole blood donations', 'At least 90 days must elapse since your last blood donation.', 1),
        ('hemoglobin_standard', 'medical', 12.5, 18.0, 'Hemoglobin must be >= 12.5 g/dL (evaluated at clinical facility)', 'Preliminary clinical hemoglobin threshold requires on-site testing.', 1),
        ('health_declaration', 'declaration', 1.0, 1.0, 'Donor confirms no recent fever, antibiotics, major surgery in 6 months', 'Mandatory preliminary self-declaration on medical suitability.', 1)
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO medical_screening_rules (rule_name, rule_category, min_value, max_value, description, error_message, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    """, screening_rules)

    # 4. Blood Compatibility Matrix (Recipient -> Donor)
    compatibility_data = [
        # O- can only receive O-
        ('O-', 'O-', 1, 1),
        # O+ can receive O+, O-
        ('O+', 'O+', 1, 1),
        ('O+', 'O-', 1, 2),
        # A- can receive A-, O-
        ('A-', 'A-', 1, 1),
        ('A-', 'O-', 1, 2),
        # A+ can receive A+, A-, O+, O-
        ('A+', 'A+', 1, 1),
        ('A+', 'A-', 1, 2),
        ('A+', 'O+', 1, 2),
        ('A+', 'O-', 1, 2),
        # B- can receive B-, O-
        ('B-', 'B-', 1, 1),
        ('B-', 'O-', 1, 2),
        # B+ can receive B+, B-, O+, O-
        ('B+', 'B+', 1, 1),
        ('B+', 'B-', 1, 2),
        ('B+', 'O+', 1, 2),
        ('B+', 'O-', 1, 2),
        # AB- can receive AB-, A-, B-, O-
        ('AB-', 'AB-', 1, 1),
        ('AB-', 'A-', 1, 2),
        ('AB-', 'B-', 1, 2),
        ('AB-', 'O-', 1, 2),
        # AB+ (Universal red cell recipient) can receive all 8
        ('AB+', 'AB+', 1, 1),
        ('AB+', 'AB-', 1, 2),
        ('AB+', 'A+', 1, 2),
        ('AB+', 'A-', 1, 2),
        ('AB+', 'B+', 1, 2),
        ('AB+', 'B-', 1, 2),
        ('AB+', 'O+', 1, 2),
        ('AB+', 'O-', 1, 2)
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO compatibility_rules (recipient_group, donor_group, is_compatible, clinical_priority)
        VALUES (?, ?, ?, ?);
    """, compatibility_data)

    # 5. Packages for Blood Banks (Pricing & Platform Commission)
    import json
    packages = [
        (
            1, 'BASIC', 0.0, 0.0,
            'Free basic institutional profile and standard verified listing in public directory.',
            json.dumps(['Public Verified Directory Listing', 'Basic Organization Profile', 'Standard Dashboard', 'View Public Requests'])
        ),
        (
            2, 'PROFESSIONAL', 4500.0, 5.0,
            'Comprehensive inventory & request management with real-time stock sync and analytics.',
            json.dumps(['Complete 8-Group Live Inventory Sync', 'Direct Emergency Request Routing', 'Automated Fallback Dispatch', 'Real-Time Analytics & Transaction Auditing', '5% Platform Service Fee per Eligible Supply'])
        ),
        (
            3, 'ENTERPRISE', 12000.0, 3.5,
            'Multi-branch organizational management, priority tech support, and regional automated reservation system.',
            json.dumps(['Unlimited Multi-Branch Management', 'Priority Transfusion Network Routing', 'Custom API & LIMS Integration Ready', 'Dedicated Healthcare Support Officer', 'Reduced 3.5% Service Coordination Fee'])
        )
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO packages (id, name, price, commission_percent, description, features_json)
        VALUES (?, ?, ?, ?, ?, ?);
    """, packages)

    # 6. Admin Account
    admin_hash, admin_salt = hash_password("Admin@12345")
    cursor.execute("""
        INSERT INTO users (email, password_hash, password_salt, role, full_name, phone, status)
        VALUES ('admin@rabta.pk', ?, ?, 'admin', 'RABTA Chief Administrator', '+92 300 0000001', 'active');
    """, (admin_hash, admin_salt))
    admin_id = cursor.lastrowid

    # 7. Pre-populated Demo Requesters
    req_hash, req_salt = hash_password("Requester@123")
    cursor.execute("""
        INSERT INTO users (email, password_hash, password_salt, role, full_name, phone, status)
        VALUES ('requester@rabta.pk', ?, ?, 'requester', 'Tariq Mansoor', '+92 321 8234567', 'active');
    """, (req_hash, req_salt))
    req_user_id = cursor.lastrowid
    cursor.execute("""
        INSERT INTO requesters (user_id, relationship_default, address, city, district)
        VALUES (?, 'Brother', 'Block 7, Gulshan-e-Iqbal', 'Karachi', 'East Karachi');
    """, (req_user_id,))

    # 8. Pre-populated Demo Verified Blood Banks in Karachi
    blood_banks_data = [
        (
            'indus.bb@rabta.pk', 'Indus Hospital & Health Network Blood Center', 'BB-KHI-2024-001',
            'Dr. Saba Jamal (Director Transfusion)', '+92 21 35112709', 'bloodcenter@tih.org.pk',
            'Karachi', 'Korangi', 'Plot C-76, Sector 31/5, Opposite Darussalam Society, Korangi Crossing',
            24.8322, 67.1278, 3, 2
        ),
        (
            'siut.bb@rabta.pk', 'SIUT Transfusion Medicine & Blood Bank', 'BB-KHI-2024-002',
            'Dr. Farhana Zafar', '+92 21 99215752', 'bloodbank@siut.org',
            'Karachi', 'South Karachi', 'Sardar Yaqoob Ali Khan Road, Near Civil Hospital, Saddar',
            24.8596, 67.0102, 2, 2
        ),
        (
            'fatimid.bb@rabta.pk', 'Fatimid Foundation Blood Transfusion Services', 'BB-KHI-2024-003',
            'Col. (R) Dr. Nadeem Akhtar', '+92 21 32225284', 'contact@fatimid.org',
            'Karachi', 'East Karachi', '393/B, Britto Road, Garden East',
            24.8778, 67.0294, 4, 3
        ),
        (
            'hussaini.bb@rabta.pk', 'Hussaini Blood Bank & Oncology Center', 'BB-KHI-2024-004',
            'Dr. Asif Surani', '+92 21 32238405', 'info@hussaini.org.pk',
            'Karachi', 'Central Karachi', 'Plot 1/C, Block 2, Nazimabad No. 3',
            24.9189, 67.0315, 2, 2
        ),
        (
            'omairsana.bb@rabta.pk', 'Omair Sana Foundation Thalassemia Blood Center', 'BB-KHI-2024-005',
            'Dr. Saqib Ansari', '+92 21 34983636', 'info@osf.org.pk',
            'Karachi', 'East Karachi', 'Block 13-A, University Road, Gulshan-e-Iqbal',
            24.9192, 67.0984, 1, 2
        )
    ]

    bb_hash, bb_salt = hash_password("Bank@12345")
    bb_ids = []
    for email, name, lic, contact, phone, oemail, city, district, addr, lat, lng, branches, pkg in blood_banks_data:
        cursor.execute("""
            INSERT INTO users (email, password_hash, password_salt, role, full_name, phone, status)
            VALUES (?, ?, ?, 'blood_bank', ?, ?, 'active');
        """, (email, bb_hash, bb_salt, name, phone))
        u_id = cursor.lastrowid
        cursor.execute("""
            INSERT INTO blood_banks (user_id, official_name, license_number, contact_person, official_phone, official_email, city, district, complete_address, latitude, longitude, branches_count, verification_status, package_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?);
        """, (u_id, name, lic, contact, phone, oemail, city, district, addr, lat, lng, branches, pkg))
        bb_id = cursor.lastrowid
        bb_ids.append(bb_id)

        # Create branches
        cursor.execute("""
            INSERT INTO blood_bank_branches (blood_bank_id, branch_name, branch_address, district, phone, latitude, longitude)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (bb_id, f"{name} - Main Branch", addr, district, phone, lat, lng))

        # Add initial inventory across 8 blood groups
        now = datetime.now(timezone.utc)
        groups_stock = {
            'A+': 18, 'A-': 6, 'B+': 22, 'B-': 7,
            'AB+': 12, 'AB-': 4, 'O+': 35, 'O-': 9
        }
        for bg, qty in groups_stock.items():
            coll_date = (now - timedelta(days=5)).strftime("%Y-%m-%d")
            exp_date = (now + timedelta(days=30)).strftime("%Y-%m-%d")
            batch_num = f"BTC-{bg.replace('+', 'P').replace('-', 'N')}-{bb_id}{secrets.token_hex(2).upper()}"
            cursor.execute("""
                INSERT INTO blood_inventory (blood_bank_id, branch_id, blood_group, available_units, reserved_units, collection_date, expiry_date, batch_number, verification_status)
                VALUES (?, 1, ?, ?, 0, ?, ?, ?, 'confirmed');
            """, (bb_id, bg, qty, coll_date, exp_date, batch_num))

    # 9. Pre-populated Demo Donors across Karachi districts
    donors_data = [
        ('donor.ali@rabta.pk', 'Ali Raza', '+92 301 2345678', '1995-04-12', 'male', 'O-', 72.5, '2026-06-10', 'Karachi', 'South Karachi', 'Clifton Block 2', 24.8198, 67.0275),
        ('donor.fatima@rabta.pk', 'Fatima Zahra', '+92 333 3456789', '1998-09-21', 'female', 'A+', 56.0, '2026-05-15', 'Karachi', 'East Karachi', 'Gulshan Block 4', 24.9210, 67.0910),
        ('donor.bilal@rabta.pk', 'Bilal Ahmed', '+92 345 4567890', '1992-11-03', 'male', 'B+', 78.0, '2026-04-01', 'Karachi', 'Central Karachi', 'North Nazimabad Block H', 24.9450, 67.0420),
        ('donor.ayesha@rabta.pk', 'Ayesha Siddiqua', '+92 312 5678901', '2000-01-18', 'female', 'O+', 61.0, '2026-07-20', 'Karachi', 'Korangi', 'Korangi 2 1/2', 24.8380, 67.1190),
        ('donor.hamza@rabta.pk', 'Hamza Qureshi', '+92 300 6789012', '1996-07-08', 'male', 'AB-', 69.0, '2026-03-14', 'Karachi', 'Malir', 'Malir Cantt Check Post 5', 24.9120, 67.1950),
        ('donor.usman@rabta.pk', 'Usman Ghani', '+92 322 7890123', '1994-03-30', 'male', 'O-', 75.0, '2026-02-10', 'Karachi', 'West Karachi', 'SITE Area Metroville', 24.9010, 66.9850),
        ('donor.zainab@rabta.pk', 'Zainab Noor', '+92 334 8901234', '1999-12-14', 'female', 'A-', 54.5, '2026-06-01', 'Karachi', 'Keamari', 'Mouripur Road', 24.8450, 66.9550),
        ('donor.saad@rabta.pk', 'Saad Farooq', '+92 315 9012345', '1993-08-25', 'male', 'AB+', 82.0, '2026-05-10', 'Karachi', 'East Karachi', 'Bahadurabad', 24.8820, 67.0680)
    ]

    donor_hash, donor_salt = hash_password("Donor@123")
    for email, name, phone, dob, gender, bg, weight, last_don, city, district, area, lat, lng in donors_data:
        cursor.execute("""
            INSERT INTO users (email, password_hash, password_salt, role, full_name, phone, status)
            VALUES (?, ?, ?, 'donor', ?, ?, 'active');
        """, (email, donor_hash, donor_salt, name, phone))
        u_id = cursor.lastrowid
        # calculate age
        birth_year = int(dob.split('-')[0])
        age = 2026 - birth_year
        cursor.execute("""
            INSERT INTO donors (user_id, date_of_birth, age, gender, blood_group, weight_kg, last_donation_date, city, district, residential_area, latitude, longitude, availability_status, screening_passed, verified_status, total_donations_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', 1, 'verified', 3);
        """, (u_id, dob, age, gender, bg, weight, last_don, city, district, area, lat, lng))
        d_id = cursor.lastrowid

        # Add donation history
        cursor.execute("""
            INSERT INTO donation_history (donor_id, blood_bank_id, donation_date, units_donated, blood_group, facility_name, notes)
            VALUES (?, 1, ?, 1, ?, 'Indus Hospital Blood Center', 'Whole blood donation verified by attending transfusion officer.');
        """, (d_id, last_don, bg))

    # 10. Sample Active Emergency Blood Request
    cursor.execute("""
        INSERT INTO blood_requests (
            request_code, requester_user_id, patient_name, blood_group, units_required,
            required_datetime, urgency, hospital_name, hospital_address, city, district,
            latitude, longitude, medical_notes, status
        ) VALUES (
            'RBT-REQ-2026-7841', ?, 'Baby Arham (Thalassemia Major)', 'O-', 2,
            datetime('now', '+6 hours'), 'emergency', 'National Institute of Child Health (NICH)',
            'Rafique Shaheed Road, Karachi Cantonment', 'Karachi', 'South Karachi',
            24.8512, 67.0435, 'Urgent packed red cell transfusion scheduled for thalassemia patient.', 'donors_notified'
        );
    """, (req_user_id,))
    sample_req_id = cursor.lastrowid

    # Add match for Ali Raza (O-)
    cursor.execute("SELECT id FROM donors WHERE blood_group = 'O-' LIMIT 1;")
    d_row = cursor.fetchone()
    if d_row:
        first_donor_id = d_row[0]
        cursor.execute("""
            INSERT INTO donor_matches (request_id, donor_id, match_score, distance_km, status)
            VALUES (?, ?, 96.5, 3.8, 'accepted');
        """, (sample_req_id, first_donor_id))

        # Add in-app notification for requester
        cursor.execute("""
            INSERT INTO notifications (user_id, title, message, notification_type, reference_id, reference_type)
            VALUES (?, 'Donor Responded: Match Confirmed!', 'A verified O- donor near NICH Hospital has accepted your emergency request RBT-REQ-2026-7841.', 'match_alert', ?, 'blood_request');
        """, (req_user_id, sample_req_id))

    conn.commit()
    print("Demo data seeded with verified Karachi blood centers, donors, and active request.")

if __name__ == "__main__":
    init_db()
