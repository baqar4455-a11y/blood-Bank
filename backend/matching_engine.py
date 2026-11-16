"""
RABTA Intelligent Donor Matching Engine & Blood Bank Fallback System
Calculates ABO/Rh compatibility, medical eligibility, Haversine geographic proximity,
and ranks suitable donors and verified blood bank inventories.
"""

import math
import sqlite3
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in kilometers using the Haversine formula."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 999.0
    R = 6371.0 # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

class MatchingEngine:
    def __init__(self, db_conn: sqlite3.Connection):
        self.conn = db_conn

    def get_compatible_groups(self, recipient_group: str) -> List[Tuple[str, int]]:
        """Returns list of (donor_group, clinical_priority) where 1=Exact, 2=Alternative compatible."""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT donor_group, clinical_priority 
            FROM compatibility_rules 
            WHERE recipient_group = ? AND is_compatible = 1
            ORDER BY clinical_priority ASC;
        """, (recipient_group,))
        return cursor.fetchall()

    def check_medical_eligibility(self, donor: dict) -> Tuple[bool, List[str]]:
        """
        Validates donor against medical screening rules stored in DB.
        Adheres strictly to medical guidance: does not promise volume based on weight;
        evaluates preliminary clinical constraints.
        """
        flags = []
        age = donor.get('age', 0)
        weight = donor.get('weight_kg', 0)
        last_donation = donor.get('last_donation_date')

        # Check screening rules
        cursor = self.conn.cursor()
        cursor.execute("SELECT rule_name, min_value, max_value, error_message FROM medical_screening_rules WHERE is_active = 1;")
        rules = {r['rule_name']: r for r in cursor.fetchall()}

        if 'donor_minimum_age' in rules:
            r = rules['donor_minimum_age']
            if age < r['min_value'] or age > r['max_value']:
                flags.append(f"Age {age} outside allowable window ({r['min_value']}-{r['max_value']}).")

        if 'donor_minimum_weight' in rules:
            r = rules['donor_minimum_weight']
            if weight < r['min_value']:
                flags.append(f"Weight {weight}kg is below safe minimum of {r['min_value']}kg.")

        if 'donation_interval_days' in rules and last_donation:
            try:
                last_dt = datetime.strptime(last_donation, "%Y-%m-%d")
                now = datetime.now()
                days_since = (now - last_dt).days
                min_days = int(rules['donation_interval_days']['min_value'])
                if days_since < min_days:
                    flags.append(f"Only {days_since} days since last donation. Minimum {min_days} days required for safe recovery.")
            except Exception:
                pass

        if donor.get('screening_passed') == 0:
            flags.append("Preliminary health questionnaire flagged clinical contraindications.")

        return (len(flags) == 0, flags)

    def find_matching_donors(self, request_id: int, max_results: int = 15) -> List[Dict[str, Any]]:
        """
        Core intelligent algorithm:
        1. Fetch request details.
        2. Identify ABO/Rh compatible donors.
        3. Filter by availability and medical eligibility rules.
        4. Calculate geographic distance (Haversine).
        5. Score & rank candidates based on compatibility, district match, distance, and verification.
        6. Persist matches in donor_matches.
        """
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT r.*, u.full_name as requester_name, u.phone as requester_phone
            FROM blood_requests r
            JOIN users u ON r.requester_user_id = u.id
            WHERE r.id = ?;
        """, (request_id,))
        req = cursor.fetchone()
        if not req:
            return []

        req = dict(req)
        recipient_group = req['blood_group']
        hosp_lat = req.get('latitude') or 24.8607 # Default Karachi central if missing
        hosp_lng = req.get('longitude') or 67.0011
        hosp_district = req.get('district', '')

        # Compatible groups
        compat_rows = self.get_compatible_groups(recipient_group)
        compat_map = {row['donor_group']: row['clinical_priority'] for row in compat_rows}
        if not compat_map:
            return []

        placeholders = ','.join('?' for _ in compat_map.keys())
        query = f"""
            SELECT d.*, u.full_name, u.email, u.phone, u.status as user_status
            FROM donors d
            JOIN users u ON d.user_id = u.id
            WHERE d.blood_group IN ({placeholders})
              AND d.availability_status = 'available'
              AND d.verified_status = 'verified'
              AND u.status = 'active';
        """
        cursor.execute(query, list(compat_map.keys()))
        candidates = [dict(c) for c in cursor.fetchall()]

        ranked_matches = []
        for donor in candidates:
            # 1. Medical screening check
            is_eligible, flags = self.check_medical_eligibility(donor)
            if not is_eligible:
                continue

            # 2. Distance calculation
            donor_lat = donor.get('latitude')
            donor_lng = donor.get('longitude')
            distance = haversine_distance(hosp_lat, hosp_lng, donor_lat, donor_lng)

            # 3. Intelligent Scoring
            # Base score: Exact group = 50 pts, Compatible = 30 pts
            priority = compat_map.get(donor['blood_group'], 2)
            compat_score = 50.0 if priority == 1 else 30.0

            # Proximity score (max 40 pts)
            if distance <= 5.0:
                dist_score = 40.0
            elif distance <= 12.0:
                dist_score = 30.0
            elif distance <= 25.0:
                dist_score = 20.0
            elif distance <= 50.0:
                dist_score = 10.0
            else:
                dist_score = 5.0

            # District exact match bonus (+10 pts)
            district_bonus = 10.0 if donor.get('district', '').strip().lower() == hosp_district.strip().lower() else 0.0

            # Verified donation track record (+5 pts)
            rep_bonus = min(5.0, (donor.get('total_donations_count', 0) * 1.5))

            total_score = round(compat_score + dist_score + district_bonus + rep_bonus, 1)

            # Privacy masking: protect donor's exact coordinates for public output
            approx_lat = round(donor_lat, 2) if donor_lat else None
            approx_lng = round(donor_lng, 2) if donor_lng else None

            # Anonymize phone unless consented
            display_phone = donor['phone'] if not donor.get('privacy_hide_phone') else "+92 3XX-XXXXXXX (Protected)"

            match_entry = {
                'donor_id': donor['id'],
                'user_id': donor['user_id'],
                'full_name': donor['full_name'],
                'display_phone': display_phone,
                'blood_group': donor['blood_group'],
                'district': donor['district'],
                'residential_area': donor.get('residential_area', 'Karachi Metro'),
                'distance_km': distance,
                'match_score': total_score,
                'approx_lat': approx_lat,
                'approx_lng': approx_lng,
                'total_donations': donor.get('total_donations_count', 0),
                'is_exact_match': (priority == 1)
            }
            ranked_matches.append(match_entry)

        # Sort descending by match_score, then ascending by distance
        ranked_matches.sort(key=lambda x: (-x['match_score'], x['distance_km']))
        top_matches = ranked_matches[:max_results]

        # Save matches in database
        for m in top_matches:
            cursor.execute("""
                INSERT OR IGNORE INTO donor_matches (request_id, donor_id, match_score, distance_km, status)
                VALUES (?, ?, ?, ?, 'notified');
            """, (request_id, m['donor_id'], m['match_score'], m['distance_km']))

        # Update request status to 'donors_notified' if matches found
        if top_matches:
            cursor.execute("""
                UPDATE blood_requests 
                SET status = 'donors_notified', updated_at = datetime('now', 'utc')
                WHERE id = ? AND status IN ('submitted', 'verification_pending', 'searching_donors');
            """, (request_id,))

        self.conn.commit()
        return top_matches

    def search_blood_banks_fallback(self, request_id: int) -> List[Dict[str, Any]]:
        """
        Fallback search: Queries verified blood banks for confirmed, unexpired stock
        compatible with the patient's blood group.
        Ranks by distance and confirmed available stock count.
        """
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM blood_requests WHERE id = ?;", (request_id,))
        req = cursor.fetchone()
        if not req:
            return []
        req = dict(req)

        recipient_group = req['blood_group']
        units_needed = req['units_required']
        hosp_lat = req.get('latitude') or 24.8607
        hosp_lng = req.get('longitude') or 67.0011

        compat_rows = self.get_compatible_groups(recipient_group)
        compat_groups = [r['donor_group'] for r in compat_rows]
        if not compat_groups:
            return []

        placeholders = ','.join('?' for _ in compat_groups)
        query = f"""
            SELECT 
                bb.id as blood_bank_id,
                bb.official_name,
                bb.complete_address,
                bb.district,
                bb.official_phone,
                bb.official_email,
                bb.latitude,
                bb.longitude,
                bb.verification_status,
                bi.id as inventory_id,
                bi.blood_group,
                bi.available_units,
                bi.expiry_date,
                bi.batch_number
            FROM blood_banks bb
            JOIN blood_inventory bi ON bb.id = bi.blood_bank_id
            WHERE bi.blood_group IN ({placeholders})
              AND bi.available_units > 0
              AND bi.verification_status = 'confirmed'
              AND date(bi.expiry_date) >= date('now')
              AND bb.verification_status = 'verified';
        """
        cursor.execute(query, compat_groups)
        rows = [dict(r) for r in cursor.fetchall()]

        # Aggregate per blood bank
        banks_dict = {}
        for r in rows:
            bb_id = r['blood_bank_id']
            if bb_id not in banks_dict:
                dist = haversine_distance(hosp_lat, hosp_lng, r['latitude'], r['longitude'])
                banks_dict[bb_id] = {
                    'blood_bank_id': bb_id,
                    'official_name': r['official_name'],
                    'address': r['complete_address'],
                    'district': r['district'],
                    'phone': r['official_phone'],
                    'email': r['official_email'],
                    'latitude': r['latitude'],
                    'longitude': r['longitude'],
                    'distance_km': dist,
                    'google_maps_url': f"https://www.google.com/maps/dir/?api=1&destination={r['latitude']},{r['longitude']}",
                    'compatible_stock': {},
                    'total_available_units': 0,
                    'can_fulfill_fully': False
                }
            bg = r['blood_group']
            banks_dict[bb_id]['compatible_stock'][bg] = banks_dict[bb_id]['compatible_stock'].get(bg, 0) + r['available_units']
            banks_dict[bb_id]['total_available_units'] += r['available_units']

        results = list(banks_dict.values())
        for b in results:
            b['can_fulfill_fully'] = b['total_available_units'] >= units_needed

        # Rank by: Can fulfill fully (desc), exact match stock (desc), distance (asc)
        results.sort(key=lambda b: (
            not b['can_fulfill_fully'],
            -b['compatible_stock'].get(recipient_group, 0),
            b['distance_km']
        ))

        # Update request status to 'searching_blood_banks' if not yet confirmed
        cursor.execute("""
            UPDATE blood_requests 
            SET status = 'searching_blood_banks', updated_at = datetime('now', 'utc')
            WHERE id = ? AND status NOT IN ('fulfilled', 'cancelled', 'blood_bank_confirmation');
        """, (request_id,))
        self.conn.commit()

        return results
