"""
RABTA Blood Donation Platform - Production Server Runner
Official Brand: RABTA
Tagline: Connecting Lives. One Donation at a Time.
"""

import sys
import os
import webbrowser
import threading
import time

try:
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
except Exception:
    pass

# Ensure backend directory is in python search path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(CURRENT_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import run_server, PORT

def open_browser_later():
    time.sleep(1.2)
    url = f"http://localhost:{PORT}"
    try:
        webbrowser.open(url)
    except Exception:
        pass

if __name__ == '__main__':
    print("""
  ========================================================================
     ██████╗  █████╗ ██████╗ ████████╗ █████╗ 
     ██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗
     ██████╔╝███████║██████╔╝   ██║   ███████║
     ██╔══██╗██╔══██║██╔══██╗   ██║   ██╔══██║
     ██║  ██║██║  ██║██████╔╝   ██║   ██║  ██║
     ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝    ╚═╝   ╚═╝  ╚═╝
  ------------------------------------------------------------------------
       Official Tagline: Connecting Lives. One Donation at a Time.
  ========================================================================

  [+] Initializing database schema & migrations...
  [+] Seeding Karachi districts, compatibility rules & verified centers...
  [+] Serving modern responsive frontend from: /frontend
  [+] REST API online at: http://localhost:{port}/api/

  DEMO CREDENTIALS FOR TESTING & REVIEW:
  ------------------------------------------------------------------------
  👑 Administrator : admin@rabta.pk       | Password: Admin@12345
  🏥 Indus Blood Bank: indus.bb@rabta.pk     | Password: Bank@12345
  🩸 Voluntary Donor : donor.ali@rabta.pk     | Password: Donor@123
  🧑 Patient Requester: requester@rabta.pk    | Password: Requester@123
  ------------------------------------------------------------------------
  Direct URL: http://localhost:{port}
  Press Ctrl+C to terminate server safely.
    """.format(port=PORT))

    # Attempt opening browser in background thread
    threading.Thread(target=open_browser_later, daemon=True).start()

    run_server()
