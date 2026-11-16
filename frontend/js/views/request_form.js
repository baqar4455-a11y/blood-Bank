/**
 * RABTA - Blood Requester Module & Form View
 * Brand: RABTA
 */

let selectedBloodGroup = 'A+';
let selectedUrgency = 'urgent';

async function renderRequestFormView(container) {
  // Pre-fill user details if logged in
  const user = State.currentUser || {};

  container.innerHTML = `
    <div class="container" style="max-width: 860px; padding: 2.5rem 1.5rem;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <div class="badge badge-red" style="margin-bottom: 0.5rem;">PATIENT BLOOD COORDINATION</div>
        <h1 style="font-size: 2.2rem; font-weight: 800; color: #fff;">
          Submit Blood Request
        </h1>
        <p style="font-size: 0.95rem; color: var(--text-muted); max-width: 620px; margin: 0.5rem auto 0;">
          Our intelligent algorithm immediately alerts compatible verified donors in your hospital's district 
          with automated fallback to verified blood banks.
        </p>
      </div>

      <form id="blood-request-form" class="card" style="padding: 2.2rem;">
        <!-- SECTION 1: PATIENT DETAILS -->
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>🩸</span> 1. Patient & Transfusion Details
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Patient Full Name or Medical Reference *</label>
              <input type="text" id="req-patient-name" class="form-control" required placeholder="e.g. Baby Zeeshan / Patient MR-8823" />
            </div>

            <!-- Blood Group Selector Buttons -->
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Required ABO/Rh Blood Group *</label>
              <div id="bg-selector-grid" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 0.5rem;">
                ${['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => `
                  <button type="button" class="btn ${bg === selectedBloodGroup ? 'btn-primary' : 'btn-secondary'} btn-sm bg-choice-btn" data-bg="${bg}" style="font-weight: 800; font-size: 0.9rem;">
                    ${bg}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Number of Blood Bags Required *</label>
              <input type="number" id="req-units" class="form-control" min="1" max="10" value="1" required />
            </div>

            <div class="form-group">
              <label class="form-label">Required Date and Time *</label>
              <input type="datetime-local" id="req-datetime" class="form-control" required />
            </div>

            <!-- Urgency Level Buttons -->
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Medical Urgency Level *</label>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
                <button type="button" class="btn btn-secondary urgency-btn" data-urgency="normal" style="padding: 0.75rem;">
                  🟢 Normal (Scheduled)
                </button>
                <button type="button" class="btn btn-primary urgency-btn" data-urgency="urgent" style="padding: 0.75rem;">
                  🟠 Urgent (&lt; 12 Hours)
                </button>
                <button type="button" class="btn btn-secondary urgency-btn" data-urgency="emergency" style="padding: 0.75rem; border-color: var(--red-primary);">
                  🚨 Emergency (Immediate)
                </button>
              </div>
            </div>
          </div>
        </div>

        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 2rem 0;" />

        <!-- SECTION 2: REQUESTER DETAILS -->
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>👤</span> 2. Requester Information
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div class="form-group">
              <label class="form-label">Requester Full Name *</label>
              <input type="text" id="req-name" class="form-control" required value="${user.full_name || ''}" placeholder="e.g. Asad Mansoor" />
            </div>

            <div class="form-group">
              <label class="form-label">Contact Number (WhatsApp/Phone) *</label>
              <input type="tel" id="req-phone" class="form-control" required value="${user.phone || ''}" placeholder="+92 3XX XXXXXXX" />
            </div>

            <div class="form-group">
              <label class="form-label">Email Address *</label>
              <input type="email" id="req-email" class="form-control" required value="${user.email || ''}" placeholder="name@domain.com" />
            </div>

            <div class="form-group">
              <label class="form-label">Relationship to Patient *</label>
              <select id="req-relationship" class="form-control form-select">
                <option value="Self">Self</option>
                <option value="Parent" selected>Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Spouse">Spouse</option>
                <option value="Child">Child</option>
                <option value="Doctor/Hospital Staff">Attending Medical Staff</option>
                <option value="Friend/Relative">Friend / Relative</option>
              </select>
            </div>
          </div>
        </div>

        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 2rem 0;" />

        <!-- SECTION 3: HOSPITAL & MAP LOCATION -->
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>🏥</span> 3. Hospital Location & Google Maps Coordinates
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Hospital Quick Select (or Enter Below)</label>
              <select id="hosp-shortcut-select" class="form-control form-select">
                <option value="">-- Choose Major Karachi Hospital --</option>
                <option value="NICH" data-name="National Institute of Child Health (NICH)" data-addr="Rafique Shaheed Road, Karachi Cantonment" data-district="South Karachi" data-lat="24.8512" data-lng="67.0435">National Institute of Child Health (NICH) - South Karachi</option>
                <option value="Civil" data-name="Civil Hospital Karachi (CHK / Dr. Ruth Pfau)" data-addr="Mission Road, New Chali" data-district="South Karachi" data-lat="24.8596" data-lng="67.0102">Civil Hospital Karachi - South Karachi</option>
                <option value="Indus" data-name="The Indus Hospital" data-addr="Korangi Crossing, Sector 31/5" data-district="Korangi" data-lat="24.8322" data-lng="67.1278">The Indus Hospital - Korangi</option>
                <option value="Liaquat" data-name="Liaquat National Hospital (LNH)" data-addr="Stadium Road, Gulshan-e-Iqbal" data-district="East Karachi" data-lat="24.8932" data-lng="67.0712">Liaquat National Hospital - East Karachi</option>
                <option value="AKUH" data-name="Aga Khan University Hospital (AKUH)" data-addr="National Stadium Road" data-district="East Karachi" data-lat="24.8920" data-lng="67.0745">Aga Khan University Hospital - East Karachi</option>
                <option value="SIUT" data-name="Sindh Institute of Urology and Transplantation (SIUT)" data-addr="Sardar Yaqoob Ali Khan Road" data-district="South Karachi" data-lat="24.8601" data-lng="67.0110">SIUT - South Karachi</option>
                <option value="Abbasi" data-name="Abbasi Shaheed Hospital" data-addr="Block M, North Nazimabad" data-district="Central Karachi" data-lat="24.9350" data-lng="67.0340">Abbasi Shaheed Hospital - Central Karachi</option>
                <option value="JPMC" data-name="Jinnah Postgraduate Medical Centre (JPMC)" data-addr="Rafiqui Shaheed Road, Cantonment" data-district="South Karachi" data-lat="24.8525" data-lng="67.0450">JPMC - South Karachi</option>
              </select>
            </div>

            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Hospital Name *</label>
              <input type="text" id="req-hosp-name" class="form-control" required placeholder="e.g. National Institute of Child Health (NICH)" />
            </div>

            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Hospital Street Address *</label>
              <input type="text" id="req-hosp-addr" class="form-control" required placeholder="Street, Sector, or Landmark" />
            </div>

            <div class="form-group">
              <label class="form-label">City *</label>
              <select id="req-city" class="form-control form-select">
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
              <select id="req-district" class="form-control form-select" required>
                <option value="South Karachi" selected>South Karachi</option>
                <option value="East Karachi">East Karachi</option>
                <option value="Central Karachi">Central Karachi</option>
                <option value="Korangi">Korangi</option>
                <option value="Malir">Malir</option>
                <option value="West Karachi">West Karachi</option>
                <option value="Keamari">Keamari</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Latitude (for Proximity Calculation)</label>
              <input type="number" step="0.0001" id="req-lat" class="form-control" value="24.8512" />
            </div>

            <div class="form-group">
              <label class="form-label">Longitude (for Proximity Calculation)</label>
              <input type="number" step="0.0001" id="req-lng" class="form-control" value="67.0435" />
            </div>
          </div>
        </div>

        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 2rem 0;" />

        <!-- SECTION 4: MEDICAL NOTES -->
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem;">
            <span>📋</span> 4. Clinical Notes & Additional Details
          </h3>
          <div class="form-group">
            <label class="form-label">Clinical Indication or Diagnosis (Optional)</label>
            <textarea id="req-notes" class="form-control" rows="3" placeholder="e.g. Emergency cesarean section / Thalassemia transfusion / Trauma surgery"></textarea>
          </div>
        </div>

        <button type="submit" id="submit-request-btn" class="btn btn-primary btn-lg" style="width: 100%;">
          🚨 Submit Blood Request & Initiate Donor Matching
        </button>

        <p style="font-size: 0.78rem; color: var(--text-dim); text-align: center; margin-top: 1rem; line-height: 1.4;">
          ⚠️ <strong>Medical Notice:</strong> RABTA connects requesters with voluntary donors and licensed facilities. 
          Final cross-matching, transfusion eligibility, and screening must be clinically verified by licensed medical staff.
        </p>
      </form>
    </div>
  `;

  // Set default datetime to +3 hours from now
  const now = new Date();
  now.setHours(now.getHours() + 3);
  const isoLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById('req-datetime').value = isoLocal;

  // Blood group selection handlers
  const bgButtons = document.querySelectorAll('.bg-choice-btn');
  bgButtons.forEach(btn => {
    btn.onclick = () => {
      bgButtons.forEach(b => {
        b.className = 'btn btn-secondary btn-sm bg-choice-btn';
      });
      btn.className = 'btn btn-primary btn-sm bg-choice-btn';
      selectedBloodGroup = btn.getAttribute('data-bg');
    };
  });

  // Urgency selection handlers
  const urgencyButtons = document.querySelectorAll('.urgency-btn');
  urgencyButtons.forEach(btn => {
    btn.onclick = () => {
      urgencyButtons.forEach(b => b.className = 'btn btn-secondary urgency-btn');
      btn.className = 'btn btn-primary urgency-btn';
      selectedUrgency = btn.getAttribute('data-urgency');
    };
  });

  // Hospital shortcut auto-filler
  const shortcutSelect = document.getElementById('hosp-shortcut-select');
  shortcutSelect.onchange = () => {
    const opt = shortcutSelect.selectedOptions[0];
    if (opt && opt.value) {
      document.getElementById('req-hosp-name').value = opt.getAttribute('data-name');
      document.getElementById('req-hosp-addr').value = opt.getAttribute('data-addr');
      document.getElementById('req-district').value = opt.getAttribute('data-district');
      document.getElementById('req-lat').value = opt.getAttribute('data-lat');
      document.getElementById('req-lng').value = opt.getAttribute('data-lng');
    }
  };

  // Submit Handler
  document.getElementById('blood-request-form').onsubmit = async (e) => {
    e.preventDefault();

    // Check if user is authenticated; if not, register them automatically as requester
    if (!State.isAuthenticated) {
      const email = document.getElementById('req-email').value;
      const phone = document.getElementById('req-phone').value;
      const name = document.getElementById('req-name').value;
      try {
        const regRes = await API.post('/api/auth/register', {
          role: 'requester',
          email: email,
          password: 'User@' + Math.floor(1000 + Math.random() * 9000),
          full_name: name,
          phone: phone,
          district: document.getElementById('req-district').value
        });
        State.setUser(regRes.user, regRes.token);
      } catch (err) {
        // If account already exists, prompt login
        if (err.message && err.message.includes('already exists')) {
          showToast('An account with this email already exists. Please sign in.', 'info');
          openAuthModal('login');
          return;
        }
      }
    }

    const payload = {
      patient_name: document.getElementById('req-patient-name').value,
      blood_group: selectedBloodGroup,
      units_required: parseInt(document.getElementById('req-units').value),
      required_datetime: document.getElementById('req-datetime').value,
      urgency: selectedUrgency,
      hospital_name: document.getElementById('req-hosp-name').value,
      hospital_address: document.getElementById('req-hosp-addr').value,
      city: document.getElementById('req-city').value,
      district: document.getElementById('req-district').value,
      latitude: parseFloat(document.getElementById('req-lat').value),
      longitude: parseFloat(document.getElementById('req-lng').value),
      medical_notes: document.getElementById('req-notes').value
    };

    try {
      const btn = document.getElementById('submit-request-btn');
      btn.disabled = true;
      btn.innerHTML = '⏳ Matching Eligible Donors in District...';

      const res = await API.post('/api/requests', payload);
      showToast(res.message, 'success');

      // Navigate to requester dashboard with the newly created request
      window.location.hash = `#/requester-dashboard?id=${res.request_id}`;
    } catch (err) {
      showToast(err.message || 'Failed to submit request.', 'error');
      document.getElementById('submit-request-btn').disabled = false;
      document.getElementById('submit-request-btn').innerHTML = '🚨 Submit Blood Request & Initiate Donor Matching';
    }
  };
}
