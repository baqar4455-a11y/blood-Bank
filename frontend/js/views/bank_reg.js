/**
 * RABTA - Blood Bank Institutional Registration View
 * Brand: RABTA
 */

async function renderBankRegView(container) {
  container.innerHTML = `
    <div class="container" style="max-width: 860px; padding: 2.5rem 1.5rem;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <div class="badge badge-amber" style="margin-bottom: 0.5rem;">INSTITUTIONAL ENROLLMENT</div>
        <h1 style="font-size: 2.2rem; font-weight: 800; color: #fff;">
          Register Blood Bank or Transfusion Center
        </h1>
        <p style="font-size: 0.95rem; color: var(--text-muted); max-width: 620px; margin: 0.5rem auto 0;">
          Connect your licensed blood bank to RABTA's real-time emergency routing network.
          Manage live ABO/Rh inventory, multi-branch operations, and verified blood reservations.
        </p>
      </div>

      <form id="bank-registration-form" class="card" style="padding: 2.2rem;">
        <!-- INSTITUTION PROFILE -->
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem;">
            <span>🏥</span> 1. Organization & Regulatory Licensing
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Official Registered Blood Bank / Hospital Name *</label>
              <input type="text" id="bank-name" class="form-control" required placeholder="e.g. National Institute of Blood Diseases (NIBD) Blood Center" />
            </div>

            <div class="form-group">
              <label class="form-label">Health Department / SBTA License Number *</label>
              <input type="text" id="bank-license" class="form-control" required placeholder="e.g. SBTA-LIC-2026-449" />
            </div>

            <div class="form-group">
              <label class="form-label">Number of Operating Branches</label>
              <input type="number" id="bank-branches" class="form-control" min="1" max="50" value="1" />
            </div>
          </div>
        </div>

        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 2rem 0;" />

        <!-- CONTACT & AUTH -->
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem;">
            <span>👨‍⚕️</span> 2. Authorized Transfusion Officer / Contact
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div class="form-group">
              <label class="form-label">Director / In-Charge Medical Officer Name *</label>
              <input type="text" id="bank-contact" class="form-control" required placeholder="e.g. Dr. Salman Qazi (Hematologist)" />
            </div>

            <div class="form-group">
              <label class="form-label">Official Institutional Phone *</label>
              <input type="tel" id="bank-phone" class="form-control" required placeholder="+92 21 3XXXXXXX" />
            </div>

            <div class="form-group">
              <label class="form-label">Official Email (Login Username) *</label>
              <input type="email" id="bank-email" class="form-control" required placeholder="bloodcenter@hospital.org.pk" />
            </div>

            <div class="form-group">
              <label class="form-label">Account Password *</label>
              <input type="password" id="bank-password" class="form-control" required placeholder="••••••••" minlength="6" />
            </div>
          </div>
        </div>

        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 2rem 0;" />

        <!-- LOCATION -->
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem;">
            <span>📍</span> 3. Facility Location & Coordinates
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div class="form-group">
              <label class="form-label">City *</label>
              <select id="bank-city" class="form-control form-select">
                <option value="Karachi" selected>Karachi</option>
                <option value="Lahore">Lahore</option>
                <option value="Islamabad">Islamabad</option>
                <option value="Rawalpindi">Rawalpindi</option>
                <option value="Peshawar">Peshawar</option>
                <option value="Quetta">Quetta</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Karachi District *</label>
              <select id="bank-district" class="form-control form-select" required>
                <option value="Central Karachi" selected>Central Karachi</option>
                <option value="East Karachi">East Karachi</option>
                <option value="South Karachi">South Karachi</option>
                <option value="Korangi">Korangi</option>
                <option value="Malir">Malir</option>
                <option value="West Karachi">West Karachi</option>
                <option value="Keamari">Keamari</option>
              </select>
            </div>

            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Complete Street Address *</label>
              <input type="text" id="bank-address" class="form-control" required placeholder="e.g. Plot ST-19, Block 17, Gulberg Town, Karachi" />
            </div>

            <div class="form-group">
              <label class="form-label">Facility Latitude</label>
              <input type="number" step="0.0001" id="bank-lat" class="form-control" value="24.9350" />
            </div>

            <div class="form-group">
              <label class="form-label">Facility Longitude</label>
              <input type="number" step="0.0001" id="bank-lng" class="form-control" value="67.0420" />
            </div>
          </div>
        </div>

        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem;">
          <div style="font-weight: 700; color: #FCD34D; font-size: 0.88rem;">
            Institutional Verification Notice
          </div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; line-height: 1.4;">
            To ensure patient safety, newly registered blood banks undergo credential verification by RABTA administrators before being displayed in public emergency directories. You can immediately access your inventory management portal upon registration.
          </p>
        </div>

        <button type="submit" id="submit-bank-btn" class="btn btn-primary btn-lg" style="width: 100%;">
          Submit Blood Bank Registration & Open Portal
        </button>
      </form>
    </div>
  `;

  document.getElementById('bank-registration-form').onsubmit = async (e) => {
    e.preventDefault();

    const payload = {
      role: 'blood_bank',
      official_name: document.getElementById('bank-name').value,
      full_name: document.getElementById('bank-contact').value,
      email: document.getElementById('bank-email').value,
      password: document.getElementById('bank-password').value,
      phone: document.getElementById('bank-phone').value,
      license_number: document.getElementById('bank-license').value,
      branches_count: parseInt(document.getElementById('bank-branches').value),
      city: document.getElementById('bank-city').value,
      district: document.getElementById('bank-district').value,
      complete_address: document.getElementById('bank-address').value,
      latitude: parseFloat(document.getElementById('bank-lat').value),
      longitude: parseFloat(document.getElementById('bank-lng').value)
    };

    try {
      const btn = document.getElementById('submit-bank-btn');
      btn.disabled = true;
      btn.innerHTML = 'Registering Blood Bank...';

      const res = await API.post('/api/auth/register', payload);
      State.setUser(res.user, res.token);
      showToast('Registration submitted! Institutional portal is now active.', 'success');
      window.location.hash = '#/bank-dashboard';
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'error');
      document.getElementById('submit-bank-btn').disabled = false;
      document.getElementById('submit-bank-btn').innerHTML = 'Submit Blood Bank Registration & Open Portal';
    }
  };
}
