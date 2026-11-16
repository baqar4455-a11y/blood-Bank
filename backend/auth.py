"""
RABTA Authentication and Role-Based Access Control (RBAC) System
Handles secure user registration, login, token management, and permission validation.
"""

import sqlite3
import secrets
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from database import hash_password, verify_password

# In-memory session store backed by token lookup
ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}
SESSION_TTL_SECONDS = 86400 * 7 # 7 days session lifetime

def create_session(user: dict) -> str:
    token = secrets.token_hex(32)
    ACTIVE_SESSIONS[token] = {
        "user_id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "full_name": user["full_name"],
        "status": user["status"],
        "created_at": time.time(),
        "expires_at": time.time() + SESSION_TTL_SECONDS
    }
    return token

def get_current_user_from_token(token: str, conn: sqlite3.Connection) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    session = ACTIVE_SESSIONS.get(token)
    if not session:
        return None

    if time.time() > session["expires_at"]:
        del ACTIVE_SESSIONS[token]
        return None

    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, email, role, full_name, phone, status, created_at
        FROM users WHERE id = ?;
    """, (session["user_id"],))
    user = cursor.fetchone()
    if not user or user["status"] == "suspended":
        return None

    user_dict = dict(user)

    # Attach role-specific profile ID
    if user_dict["role"] == "donor":
        cursor.execute("SELECT id, blood_group, district, availability_status, verified_status, total_donations_count FROM donors WHERE user_id = ?;", (user_dict["id"],))
        d = cursor.fetchone()
        if d:
            user_dict["donor_profile"] = dict(d)
    elif user_dict["role"] == "blood_bank":
        cursor.execute("SELECT id, official_name, license_number, district, verification_status, package_id FROM blood_banks WHERE user_id = ?;", (user_dict["id"],))
        bb = cursor.fetchone()
        if bb:
            user_dict["blood_bank_profile"] = dict(bb)
    elif user_dict["role"] == "requester":
        cursor.execute("SELECT id, district FROM requesters WHERE user_id = ?;", (user_dict["id"],))
        req = cursor.fetchone()
        if req:
            user_dict["requester_profile"] = dict(req)

    return user_dict

def invalidate_session(token: str):
    if token in ACTIVE_SESSIONS:
        del ACTIVE_SESSIONS[token]

def authenticate_user(email: str, password: str, conn: sqlite3.Connection) -> Tuple[bool, Optional[Dict[str, Any]], str]:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ? COLLATE NOCASE;", (email.strip(),))
    user = cursor.fetchone()
    if not user:
        return False, None, "Invalid email or password."

    user_dict = dict(user)
    if user_dict["status"] == "suspended":
        return False, None, "This account has been suspended by an administrator. Please contact support."

    if not verify_password(password, user_dict["password_hash"], user_dict["password_salt"]):
        return False, None, "Invalid email or password."

    # Remove sensitive password details from returned dict
    del user_dict["password_hash"]
    del user_dict["password_salt"]

    # Attach profile info
    if user_dict["role"] == "donor":
        cursor.execute("SELECT * FROM donors WHERE user_id = ?;", (user_dict["id"],))
        d = cursor.fetchone()
        if d:
            user_dict["donor_profile"] = dict(d)
    elif user_dict["role"] == "blood_bank":
        cursor.execute("SELECT * FROM blood_banks WHERE user_id = ?;", (user_dict["id"],))
        bb = cursor.fetchone()
        if bb:
            user_dict["blood_bank_profile"] = dict(bb)
    elif user_dict["role"] == "requester":
        cursor.execute("SELECT * FROM requesters WHERE user_id = ?;", (user_dict["id"],))
        req = cursor.fetchone()
        if req:
            user_dict["requester_profile"] = dict(req)

    return True, user_dict, "Login successful."
