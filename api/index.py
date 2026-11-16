"""
RABTA Blood Donation Platform - Vercel Serverless Entrypoint
Official Brand: RABTA
Tagline: Connecting Lives. One Donation at a Time.
"""

import sys
import os

# Configure paths so backend modules can be imported seamlessly
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(root_dir, "backend")

for d in [root_dir, backend_dir]:
    if d not in sys.path:
        sys.path.insert(0, d)

from backend.app import RabtaRequestHandler
from backend.database import init_db

# Ensure database is initialized in /tmp if running on Vercel
try:
    init_db()
except Exception as e:
    print(f"Database init info: {e}")

class handler(RabtaRequestHandler):
    """Vercel Python runtime entrypoint."""
    pass
