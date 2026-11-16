/**
 * RABTA - Donor Registration & Medical Screening Module
 * Brand: RABTA
 */

let regBloodGroup = 'O+';
let regAvailability = 'available';

async function renderDonorRegView(container) {
  container.innerHTML = `
    <div class="container" style="max-width: 860px; padding: 2.5rem 1.5rem;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <div class="badge badge-green" style="margin-bottom: 0.5rem;">LIFESAVER REGISTRY</div>
        <h1 style="font-size: 2.2rem; font-weight: 800; color: #fff;">
          Register as a Voluntary Blood Donor
        </h1>
        <p style="font-size: 0.95rem; color: var(--text-muted); max-width: 620px; margin: 0.5rem auto 0;">
          Join Pakistan's premier verified blood donation network. Help patients in emergencies, 
          manage your availability, and track your verified donation history.
        </p>
      </div>

      <form id="donor-registration-form" class="card" style="padding: 2.2rem;">
        <!-- SECTION 1: PERSONAL INFORMATION -->
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem;">
            <span>👤</span> 1. Personal & Contact Information
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Full Legal Name *</label>
              <input type="text" id="donor-name" class="form-control" required placeholder="e.g. Bilal Ahmed Siddiqui" />
            </div>

            <div class="form-group">
              <label class="form-label">Email Address (Login Username) *</label>
              <input type="email" id="donor-email" class="form-control" required placeholder="name@domain.com" />
            </div>

            <div class="form-group">
              <label class="form-label">Account Password *</label>
              <input type="password" id="donor-password" class="form-control" required placeholder="••••••••" minlength="6" />
            </div>

            <div class="form-group">
              <label class="form-label">Contact Number (SMS / WhatsApp) *</label>
              <input type="tel" id="donor-phone" class="form-control" required placeholder="+92 3XX XXXXXXX" />
            </div>

            <div class="form-group">
              <label class="form-label">Date of Birth *</label>
              <input type="date" id="donor-dob" class="form-control" required value="1998-05-15" />
            </div>

            <div class="form-group">
              <label class="form-label">Calculated Age</label>
              <input type="text" id="donor-age-display" class="form-control" readonly value="28 Years" style="background: rgba(255, 255, 255, 0.05); color: #fff;" />
            </div>

            <div class="form-group">
              <label class="form-label">Gender (Medical Safety Protocol) *</label>
              <select id="donor-gender" class="form-control form-select">
                <option value="male" selected>Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 2rem 0;" />

        <!-- SECTION 2: LOCATION & DISTRICT -->
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem;">
            <span>📍</span> 2. Location & Privacy Preferences
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div class="form-group">
              <label class="form-label">City *</label>
              <select id="donor-city" class="form-control form-select">
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
              <select id="donor-district" class="form-control form-select" required>
                <option value="South Karachi" selected>South Karachi</option>
                <option value="East Karachi">East Karachi</option>
                <option value="Central Karachi">Central Karachi</option>
                <option value="Korangi">Korangi</option>
                <option value="Malir">Malir</option>
                <option value="West Karachi">West Karachi</option>
                <option value="Keamari">Keamari</option>
              </select>
            </div>

            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Residential Area / Sector</label>
              <input type="text" id="donor-area" class="form-control" placeholder="e.g. Block 4, Clifton / Gulshan Block 13-D / North Nazimabad" />
            </div>

            <div class="form-group" style="grid-column: span 2;">
              <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; font-size: 0.88rem; color: var(--text-muted);">
                <input type="checkbox" id="donor-privacy-phone" style="accent-color: var(--red-primary);" />
                <span>Mask my phone number from requesters until I explicitly accept an emergency request.</span>
              </label>
            </div>
          </div>
        </div>

        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 2rem 0;" />

        <!-- SECTION 3: MEDICAL SCREENING & BLOOD GROUP -->
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem;">
            <span>🩸</span> 3. Blood Group & Medical Eligibility Assessment
          </h3>

          <div style="margin-bottom: 1.25rem;">
            <label class="form-label">Your Blood Group (ABO/Rh) *</label>
            <div id="donor-bg-grid" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 0.5rem;">
              ${['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => `
                <button type="button" class="btn ${bg === regBloodGroup ? 'btn-primary' : 'btn-secondary'} btn-sm donor-bg-choice" data-bg="${bg}" style="font-weight: 800;">
                  ${bg}
                </button>
              `).join('')}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div class="form-group">
              <label class="form-label">Body Weight in Kilograms (kg) *</label>
              <input type="number" id="donor-weight" class="form-control" min="40" max="200" step="0.5" value="65.0" required />
              <small style="color: var(--text-dim); font-size: 0.75rem;">Minimum 50 kg required by medical transfusion safety guidelines.</small>
            </div>

            <div class="form-group">
              <label class="form-label">Date of Last Blood Donation (if any)</label>
              <input type="date" id="donor-last-donation" class="form-control" />
              <small style="color: var(--text-dim); font-size: 0.75rem;">Leave empty if you are a first-time donor.</small>
            </div>
          </div>

          <!-- Preliminary Health Questionnaire Checkboxes -->
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-top: 1rem;">
            <div style="font-weight: 700; font-size: 0.88rem; color: #fff; margin-bottom: 0.75rem;">
              Mandatory Health Declarations
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.85rem; color: var(--text-muted);">
              <label style="display: flex; align-items: flex-start; gap: 0.6rem;">
                <input type="checkbox" id="decl-healthy" checked required style="accent-color: var(--red-primary); margin-top: 3px;" />
                <span>I am feeling well and in good health today, with no active fever, cold, or infections.</span>
              </label>
              <label style="display: flex; align-items: flex-start; gap: 0.6rem;">
                <input type="checkbox" id="decl-surgery" checked required style="accent-color: var(--red-primary); margin-top: 3px;" />
                <span>I have had no major surgery, dental extraction, or tattoo/piercing within the past 6 months.</span>
              </label>
              <label style="display: flex; align-items: flex-start; gap: 0.6rem;">
                <input type="checkbox" id="decl-meds" checked required style="accent-color: var(--red-primary); margin-top: 3px;" />
                <span>I am not currently taking regular antibiotics, blood thinners, or prohibited medications.</span>
              </label>
            </div>
          </div>

          <!-- Preliminary Screening Result Alert Box -->
          <div id="preliminary-assessment-box" style="margin-top: 1.25rem; padding: 1rem; border-radius: var(--radius-md); background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3);">
            <div style="font-weight: 700; color: #6EE7B7; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
              <span>✅</span> Preliminary Screening Status: Likely Eligible
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem; line-height: 1.4;">
              Your preliminary criteria (Age: 28, Weight: &ge;50kg, Health declarations) satisfy initial platform screening. 
              <strong>Clinical notice:</strong> Final physiological assessment, hemoglobin testing (&ge;12.5 g/dL), and blood donation volume are determined on-site exclusively by licensed transfusion medical personnel.
            </p>
          </div>
        </div>

        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 2rem 0;" />

        <!-- SECTION 4: INITIAL AVAILABILITY -->
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 1rem;">
            <span>⏰</span> 4. Initial Availability Status
          </h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
            <button type="button" class="btn btn-primary donor-avail-btn" data-avail="available">
              🟢 Available
            </button>
            <button type="button" class="btn btn-secondary donor-avail-btn" data-avail="temporarily_unavailable">
              🟡 Temporarily Away
            </button>
            <button type="button" class="btn btn-secondary donor-avail-btn" data-avail="not_accepting">
              🔴 Not Accepting
            </button>
          </div>
        </div>

        <button type="submit" id="submit-donor-btn" class="btn btn-primary btn-lg" style="width: 100%;">
          Complete Donor Registration & Access Dashboard
        </button>
      </form>
    </div>
  `;

  // Age calculation and live update
  const dobInput = document.getElementById('donor-dob');
  const ageDisplay = document.getElementById('donor-age-display');
  const weightInput = document.getElementById('donor-weight');
  const assessBox = document.getElementById('preliminary-assessment-box');

  function updateAssessment() {
    const dob = dobInput.value;
    if (!dob) return;
    const birthYear = parseInt(dob.split('-')[0]);
    const age = 2026 - birthYear;
    ageDisplay.value = `${age} Years`;

    const weight = parseFloat(weightInput.value) || 0;

    if (age < 18) {
      assessBox.style.background = 'rgba(239, 68, 68, 0.1)';
      assessBox.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      assessBox.innerHTML = `
        <div style="font-weight: 700; color: #F87171;">⚠️ Eligibility Flag: Under Minimum Legal Age</div>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
          In accordance with blood safety protocols, voluntary blood donors must be at least 18 years of age.
        </p>
      `;
    } else if (weight < 50) {
      assessBox.style.background = 'rgba(245, 158, 11, 0.1)';
      assessBox.style.borderColor = 'rgba(245, 158, 11, 0.3)';
      assessBox.innerHTML = `
        <div style="font-weight: 700; color: #FCD34D;">⚠️ Eligibility Flag: Weight Below 50 kg</div>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
          Transfusion safety guidelines require a minimum body weight of 50 kg to ensure donor circulatory safety.
        </p>
      `;
    } else {
      assessBox.style.background = 'rgba(16, 185, 129, 0.1)';
      assessBox.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      assessBox.innerHTML = `
        <div style="font-weight: 700; color: #6EE7B7;">✅ Preliminary Screening Status: Likely Eligible</div>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
          Initial screening criteria satisfied. Final medical clearance and volume confirmation is conducted by attending transfusion doctors.
        </p>
      `;
    }
  }

  dobInput.onchange = updateAssessment;
  weightInput.oninput = updateAssessment;

  // Blood group selector
  const bgBtns = document.querySelectorAll('.donor-bg-choice');
  bgBtns.forEach(btn => {
    btn.onclick = () => {
      bgBtns.forEach(b => b.className = 'btn btn-secondary btn-sm donor-bg-choice');
      btn.className = 'btn btn-primary btn-sm donor-bg-choice';
      regBloodGroup = btn.getAttribute('data-bg');
    };
  });

  // Availability selector
  const availBtns = document.querySelectorAll('.donor-avail-btn');
  availBtns.forEach(btn => {
    btn.onclick = () => {
      availBtns.forEach(b => b.className = 'btn btn-secondary donor-avail-btn');
      btn.className = 'btn btn-primary donor-avail-btn';
      regAvailability = btn.getAttribute('data-avail');
    };
  });

  // Submit Handler
  document.getElementById('donor-registration-form').onsubmit = async (e) => {
    e.preventDefault();

    const payload = {
      role: 'donor',
      full_name: document.getElementById('donor-name').value,
      email: document.getElementById('donor-email').value,
      password: document.getElementById('donor-password').value,
      phone: document.getElementById('donor-phone').value,
      date_of_birth: dobInput.value,
      gender: document.getElementById('donor-gender').value,
      city: document.getElementById('donor-city').value,
      district: document.getElementById('donor-district').value,
      residential_area: document.getElementById('donor-area').value,
      privacy_hide_phone: document.getElementById('donor-privacy-phone').checked,
      blood_group: regBloodGroup,
      weight_kg: parseFloat(weightInput.value),
      last_donation_date: document.getElementById('donor-last-donation').value || null,
      availability_status: regAvailability
    };

    try {
      const btn = document.getElementById('submit-donor-btn');
      btn.disabled = true;
      btn.innerHTML = 'Registering Donor Profile...';

      const res = await API.post('/api/auth/register', payload);
      State.setUser(res.user, res.token);
      showToast('Welcome to RABTA! Your donor profile is active.', 'success');
      window.location.hash = '#/donor-dashboard';
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'error');
      document.getElementById('submit-donor-btn').disabled = false;
      document.getElementById('submit-donor-btn').innerHTML = 'Complete Donor Registration & Access Dashboard';
    }
  };
}
