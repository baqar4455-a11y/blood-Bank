# RABTA — Complete Blood Donation & Blood Bank Management Platform

**Official Brand Name:** RABTA  
**Official Tagline:** Connecting Lives. One Donation at a Time.  

---

## 1. Executive Summary & Architecture

**RABTA** is an enterprise-grade healthcare coordination web application engineered to bridge the critical gap between patients requiring emergency blood transfusions, eligible altruistic voluntary donors, and licensed hospital blood banks.

The platform is designed around strict medical safety, patient privacy, and real-time coordination. It eliminates the risks of informal appeals by providing verified ABO/Rh compatibility matching, preliminary physiological eligibility verification, atomic inventory reservations, and rapid emergency dispatch with automated blood bank fallback.

```
rabta/
├── backend/
│   ├── app.py                 # Multi-threaded HTTP Server, API Router & Controller
│   ├── database.py            # SQLite schema, 20 relational tables, WAL mode, seeds
│   ├── auth.py                # PBKDF2-SHA256 hashing, token sessions, RBAC middleware
│   ├── matching_engine.py     # ABO/Rh compatibility, Haversine distance, medical rules
│   ├── inventory_manager.py   # Atomic stock reservations, expiry protection, dispensing
│   ├── notifications.py       # In-app alerts, SMS/Email gateway abstractions
│   └── tests.py               # Automated end-to-end test suite (8 tests)
├── frontend/
│   ├── index.html             # Single-page web application container
│   ├── css/
│   │   └── styles.css         # Deep charcoal dark theme, medical red accents, ECG animations
│   └── js/
│       ├── api.js             # API client with token management and toast alerts
│       ├── state.js           # Reactive session state and notification poller
│       ├── components/
│       │   ├── navbar.js      # Responsive navigation with role indicators & unread counter
│       │   ├── auth_modal.js  # Sign In / Register modal with 1-click demo logins
│       │   └── notifications_modal.js # Emergency alerts drawer & actions
│       ├── views/
│       │   ├── home.js        # Homepage with ECG heartbeat & 3 role selection cards
│       │   ├── request_form.js# Blood request form with Karachi hospital presets & coordinates
│       │   ├── donor_reg.js   # Donor registration with preliminary medical eligibility check
│       │   ├── bank_reg.js    # Institutional blood bank registration & branch setup
│       │   ├── requester_dash.js # 9-stage visual progress tracker & donor/bank matches
│       │   ├── donor_dash.js  # Incoming alerts, 1-click Accept/Decline, recovery countdown
│       │   ├── bank_dash.js   # 8-group inventory matrix, reservations, packages & billing
│       │   ├── live_stock.js  # Live 8-group availability dashboard with district filters
│       │   ├── bank_map.js    # Interactive Karachi map with medical pins & Google Maps links
│       │   ├── impact.js      # Audited platform impact metrics with visual SVG charts
│       │   ├── admin_dash.js  # Comprehensive administrator console with fee & rule controls
│       │   └── info_views.js  # How It Works & About RABTA healthcare standards
│       └── app.js             # Hash-based SPA router and application bootstrap
├── .env.example               # Environment variables configuration template
├── run.py                     # Standalone launcher with banner and browser launch
└── README.md                  # Complete architectural documentation & testing guide
```

---

## 2. Core Functional Modules

### A. Homepage & User Role Selection
- Dynamic animated medical red heartbeat / ECG pulse line.
- Official welcome message: *"Every Drop Counts. Every Life Matters."*
- Supporting description: *"RABTA connects people in need of blood with eligible donors and verified blood banks, helping make blood availability faster, easier and more accessible."*
- Three prominent entry cards:
  - **Option A: REQUEST BLOOD** (For patients requiring urgent or scheduled blood)
  - **Option B: REGISTER AS A DONOR** (For individuals willing to donate blood)
  - **Option C: REGISTER AS A BLOOD BANK** (For licensed transfusion centers)
- Live availability counter across all 8 blood groups in Karachi.

### B. Intelligent Donor Matching System (The Core Engine)
When a blood request is submitted:
1. **ABO/Rh Compatibility Matrix:** Clinically reviewed red cell compatibility rules (e.g., O- can donate to all 8 groups; AB+ can receive from all 8; exact ABO/Rh receives primary scoring priority).
2. **Medical Eligibility Screening:** Automatically checks that candidate age is 18–65, weight is $\ge 50$ kg, and donation interval is $\ge 90$ days since last whole blood donation.
3. **Haversine Distance Proximity:** Calculates exact distance in kilometers between hospital coordinates and donor residential coordinates:
   $$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
4. **Weighted Suitability Scoring:** Combines compatibility (50 pts exact / 30 pts compatible), proximity ($\le 5\text{ km} = 40\text{ pts}$), district bonus (10 pts), and verified donation history bonus (up to 5 pts).
5. **Donor Privacy Protection:** Protects exact residential coordinates (approximate distance and masked coordinates shown publicly); phone numbers remain masked until mutual acceptance.

### C. Automated Blood Bank Fallback & Atomic Reservation
- If candidate donors are unavailable or the request is urgent, the requester can initiate the **Blood Bank Fallback Search**.
- Queries all verified blood banks in Karachi holding confirmed, unexpired units of compatible blood groups.
- Ranks blood banks by stock adequacy and proximity to the hospital.
- **Atomic Unit Reservations:** Uses database isolation transactions (`BEGIN IMMEDIATE; UPDATE blood_inventory SET available_units = available_units - count, reserved_units = reserved_units + count`) to prevent race conditions, negative inventory, or double allocations.
- Dispensing a reservation completes the transaction, updates platform impact metrics, and calculates the platform service coordination fee.

### D. Blood Bank Inventory & Revenue Model
- Manages separate records for all 8 blood groups (A+, A-, B+, B-, AB+, AB-, O+, O-).
- Tracks available units, reserved units, collection date, expiration date (flagging batches $>35\text{ days}$ old), batch numbers, and branches.
- Three configurable institutional subscription packages:
  - **BASIC:** Free registration, standard verified directory listing.
  - **PROFESSIONAL:** Configurable platform service fee per eligible transaction (default 5%, fully editable in Admin Console), live inventory sync, automated fallback dispatch.
  - **ENTERPRISE:** Multi-branch management, dedicated support, custom coordination fee.
- **Medical Safety Guarantee:** Emergency patient matching and medical priority **never** depend on the package purchased.

### E. Live Blood Availability Dashboard
- Real-time queries across all 8 ABO/Rh blood groups.
- Displays confirmed available units, reserved units, verified holding centers, and live stock safety status badges:
  - 🟢 **Abundant / Adequate** ($>10$ bags)
  - 🟡 **Critical Low** ($1-9$ bags)
  - 🔴 **Out of Stock** ($0$ bags)
- Filterable by City and Karachi District.

### F. Nearby Blood Bank Interactive Map
- Interactive Karachi district map with district bounds (South Karachi, East Karachi, Central Karachi, Korangi, Malir, West Karachi, Keamari).
- Interactive medical pins with pulse glow on selection.
- Facility drawer displaying verified stock breakdown per blood group, contact telephone, address, and 1-click **Open in Google Maps Directions** link.

### G. 9-Stage Visual Request Progress Tracker
Requesters monitor real-time fulfillment through a visual 9-stage progression:
1. `submitted` — Request created and validated
2. `verification_pending` — Preliminary review
3. `searching_donors` — Algorithmic directory scan
4. `donors_notified` — Emergency alerts dispatched
5. `donor_response_received` — Compatible donor confirmed
6. `searching_blood_banks` — Verified bank inventory fallback
7. `blood_bank_confirmation` — Stock reserved at facility
8. `fulfilled` — Transfusion units dispensed & verified
9. `cancelled` — Cancellation with logged reason

### H. Administrator Console
- **User Management:** Approve, suspend, or reactivate donors, requesters, and blood banks.
- **Institutional Verification:** Verify hospital licenses and credential documents.
- **Dynamic Pricing & Commission:** Administrators can change package names, prices, and commission percentages dynamically (never hardcoded).
- **Clinical Safety Rules:** Configure min/max donor age, minimum weight, and recovery intervals.
- **District Management:** Dynamically add new districts and cities.
- **Audit Logs:** Full audit trail tracking user IDs, actions, entities, IP addresses, and timestamps.
- **Disputes & Complaints:** Review and resolve user disputes.

---

## 3. Demo Credentials for Immediate Evaluation

For quick evaluation, one-click preset buttons are built into the **Sign In** modal, or you can use these accounts:

| Role | Email Address | Password | Details |
|---|---|---|---|
| 👑 **Administrator** | `admin@rabta.pk` | `Admin@12345` | Chief Platform Administrator |
| 🏥 **Blood Bank** | `indus.bb@rabta.pk` | `Bank@12345` | Indus Hospital & Health Network (Korangi) |
| 🩸 **Voluntary Donor** | `donor.ali@rabta.pk` | `Donor@123` | Ali Raza (O- Universal Donor, Clifton) |
| 🧑 **Blood Requester** | `requester@rabta.pk` | `Requester@123` | Tariq Mansoor (Gulshan-e-Iqbal) |

---

## 4. Running the Automated Test Suite

RABTA includes an automated Python test suite covering unit, algorithmic, and integration flows.

Run tests from PowerShell:
```powershell
& "C:\Users\baqar\AppData\Local\Programs\Python\Python314\python.exe" C:\Users\baqar\.gemini\antigravity\scratch\rabta\backend\tests.py
```

**Test Coverage:**
- `test_01_haversine_distance`: Verifies distance precision.
- `test_02_blood_compatibility_matrix`: Verifies all 8 ABO/Rh compatibility rules.
- `test_03_medical_eligibility_screening`: Tests age, weight, and interval rejection.
- `test_04_admin_authentication`: Verifies PBKDF2-SHA256 password hashing & token RBAC.
- `test_05_intelligent_matching_algorithm`: Verifies automated candidate scoring and ranking.
- `test_06_blood_bank_fallback_search`: Verifies fallback inventory queries.
- `test_07_inventory_atomic_reservation_and_dispense`: Tests atomic unit reservation and transaction logging.
- `test_08_notification_system`: Tests in-app notification dispatch and read tracking.

---

## 5. Starting the Application

Launch the platform using the launcher:
```powershell
& "C:\Users\baqar\AppData\Local\Programs\Python\Python314\python.exe" C:\Users\baqar\.gemini\antigravity\scratch\rabta\run.py
```

The application will be live at:
**http://localhost:8080**

Enjoy using **RABTA — Connecting Lives. One Donation at a Time.**
