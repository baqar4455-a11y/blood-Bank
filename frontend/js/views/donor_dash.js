/**
 * RABTA - Donor Dashboard & Response Management
 * Brand: RABTA
 */

async function renderDonorDashView(container) {
  const user = State.currentUser;
  if (!user || user.role !== 'donor') {
    container.innerHTML = `
      <div class="container" style="text-align: center; padding: 4rem 1.5rem;">
        <div style="font-size: 2.5rem; margin-bottom: 1rem;">🔒</div>
        <h2>Donor Sign In Required</h2>
        <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem;">Please sign in with your donor account to access your response portal.</p>
        <button class="btn btn-primary" onclick="openAuthModal('login')">Sign In</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="container" style="padding: 2.5rem 1.5rem;">
      <div id="donor-profile-header">
        <div style="text-align: center; padding: 2.5rem; color: var(--text-dim);">
          Loading donor profile...
        </div>
      </div>

      <!-- INCOMING EMERGENCY REQUESTS -->
      <div style="margin-top: 2.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #fff;">
              🚨 Incoming Emergency Donation Requests
            </h3>
            <p style="font-size: 0.82rem; color: var(--text-muted);">
              Nearby patients requiring your compatible blood group. Every second counts!
            </p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="renderDonorDashView(document.getElementById('app-view'))">
            🔄 Refresh Alerts
          </button>
        </div>

        <div id="incoming-requests-list" style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="padding: 2rem; text-align: center; color: var(--text-dim);">
            Loading incoming donation alerts...
          </div>
        </div>
      </div>

      <!-- VERIFIED DONATION HISTORY -->
      <div style="margin-top: 3.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #fff;">
              📜 Verified Donation History
            </h3>
            <p style="font-size: 0.82rem; color: var(--text-muted);">
              Official donation records certified by attending transfusion centers
            </p>
          </div>
        </div>

        <div id="donor-history-table" class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 1.5rem; text-align: center; color: var(--text-dim);">
            Loading donation records...
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const profile = await API.get('/api/donor/profile');
    const headerEl = document.getElementById('donor-profile-header');

    // Calculate days since last donation & next eligible date
    let lastDonStr = profile.last_donation_date || 'Never';
    let daysSince = 999;
    let daysUntilNext = 0;
    let isEligibleToday = true;

    if (profile.last_donation_date) {
      const lastDt = new Date(profile.last_donation_date);
      const now = new Date();
      daysSince = Math.floor((now - lastDt) / (1000 * 60 * 60 * 24));
      if (daysSince < 90) {
        daysUntilNext = 90 - daysSince;
        isEligibleToday = false;
      }
    }

    headerEl.innerHTML = `
      <div class="card" style="border: 1px solid var(--border-light);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1.5rem;">
          <div style="display: flex; align-items: center; gap: 1.25rem;">
            <div style="width: 72px; height: 72px; border-radius: var(--radius-lg); background: linear-gradient(135deg, var(--red-primary), #881337); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; font-weight: 900; color: #fff; box-shadow: var(--shadow-red);">
              ${profile.blood_group}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <h1 style="font-size: 1.6rem; font-weight: 800; color: #fff;">${user.full_name}</h1>
                <span class="badge badge-green">VERIFIED DONOR</span>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;">
                ${profile.district}, Karachi | Weight: ${profile.weight_kg} kg | Age: ${profile.age} Years
              </p>
              <div style="font-size: 0.78rem; color: var(--text-dim); margin-top: 4px;">
                Total Verified Donations: <strong style="color: #fff;">${profile.total_donations_count || 0} Bags Donated</strong>
              </div>
            </div>
          </div>

          <!-- Availability Status Toggle -->
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem;">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.5rem;">
              My Current Availability
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-sm ${profile.availability_status === 'available' ? 'btn-primary' : 'btn-secondary'}" onclick="updateDonorAvail('available')">
                🟢 Available
              </button>
              <button class="btn btn-sm ${profile.availability_status === 'temporarily_unavailable' ? 'btn-primary' : 'btn-secondary'}" onclick="updateDonorAvail('temporarily_unavailable')">
                🟡 Away
              </button>
              <button class="btn btn-sm ${profile.availability_status === 'not_accepting' ? 'btn-primary' : 'btn-secondary'}" onclick="updateDonorAvail('not_accepting')">
                🔴 Paused
              </button>
            </div>
          </div>
        </div>

        <!-- Safe Donation Recovery Counter -->
        <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-size: 1.5rem;">⏱️</div>
            <div>
              <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">
                ${isEligibleToday ? 'Eligible to Donate Whole Blood Today' : `Recovery Period: ${daysUntilNext} Days Remaining`}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">
                Last Donation: ${lastDonStr} (${daysSince} days ago). 90-day recovery interval mandated for whole blood cellular replenishment.
              </div>
            </div>
          </div>
          <span class="badge badge-${isEligibleToday ? 'green' : 'amber'}">
            ${isEligibleToday ? 'MEDICALLY CLEARED' : 'SAFE RECOVERY IN PROGRESS'}
          </span>
        </div>
      </div>
    `;

    // Fetch Incoming Emergency Requests
    const incoming = await API.get('/api/donor/incoming-requests');
    const incomingList = document.getElementById('incoming-requests-list');

    if (!incoming || incoming.length === 0) {
      incomingList.innerHTML = `
        <div class="card" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-dim);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🕊️</div>
          <p>No active emergency donation requests in your district right now.</p>
          <small style="color: var(--text-dim);">You will receive immediate alerts whenever compatible patients in ${profile.district} need blood.</small>
        </div>
      `;
    } else {
      incomingList.innerHTML = incoming.map(r => `
        <div class="card" style="border: 1px solid ${r.match_status === 'accepted' ? 'var(--green)' : 'var(--border-color)'}; padding: 1.5rem;">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem;">
                <span class="blood-badge">${r.blood_group}</span>
                <span style="font-size: 1.15rem; font-weight: 800; color: #fff;">${r.request_code}</span>
                <span class="badge badge-${r.urgency === 'emergency' ? 'red' : 'amber'}">${r.urgency.toUpperCase()}</span>
                <span class="badge badge-${r.match_status === 'accepted' ? 'green' : (r.match_status === 'declined' ? 'red' : 'blue')}">
                  YOUR STATUS: ${r.match_status.toUpperCase()}
                </span>
              </div>
              <div style="font-size: 0.9rem; color: var(--text-muted);">
                Patient: <strong style="color: #fff;">${r.patient_name}</strong> | Hospital: <strong style="color: #fff;">${r.hospital_name}</strong> (${r.district})
              </div>
              <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 0.25rem;">
                Required: ${r.units_required} Bag(s) | Distance: ~${r.distance_km} km | Match Score: ${r.match_score}%
              </div>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 0.5rem;">
              ${r.match_status === 'notified' ? `
                <button class="btn btn-primary btn-sm" onclick="respondToRequest(${r.id}, 'accept')">
                  ✅ Accept & Help
                </button>
                <button class="btn btn-secondary btn-sm" onclick="respondToRequest(${r.id}, 'decline')">
                  ❌ Decline
                </button>
                <button class="btn btn-secondary btn-sm" onclick="respondToRequest(${r.id}, 'unavailable')">
                  Mark Unavailable
                </button>
              ` : `
                <span style="font-size: 0.85rem; color: var(--text-muted); align-self: center;">
                  Response recorded: <strong>${r.match_status}</strong>
                </span>
              `}
            </div>
          </div>
        </div>
      `).join('');
    }

    // Fetch Verified Donation History
    const history = await API.get('/api/donor/donation-history');
    const histTable = document.getElementById('donor-history-table');

    if (!history || history.length === 0) {
      histTable.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-dim);">No previous donation records logged.</div>`;
    } else {
      histTable.innerHTML = `
        <div class="table-responsive">
          <table class="rabta-table">
            <thead>
              <tr>
                <th>Donation Date</th>
                <th>Transfusion Facility</th>
                <th>Blood Group</th>
                <th>Units Donated</th>
                <th>Clinical Verification Notes</th>
              </tr>
            </thead>
            <tbody>
              ${history.map(h => `
                <tr>
                  <td style="font-weight: 700; color: #fff;">${h.donation_date}</td>
                  <td>${h.facility_name || h.blood_bank_name || 'Hospital Transfusion Unit'}</td>
                  <td><span class="blood-badge">${h.blood_group}</span></td>
                  <td style="font-weight: 700; color: #fff;">${h.units_donated} Bag</td>
                  <td style="font-size: 0.82rem; color: var(--text-muted);">${h.notes || 'Verified on-site by attending medical officer.'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

  } catch (err) {
    showToast('Failed to load donor portal.', 'error');
  }
}

async function updateDonorAvail(status) {
  try {
    await API.put('/api/donor/availability', { status });
    showToast(`Your availability is now set to ${status.replace(/_/g, ' ')}.`, 'success');
    renderDonorDashView(document.getElementById('app-view'));
  } catch (err) {
    showToast('Failed to update availability.', 'error');
  }
}

async function respondToRequest(requestId, action) {
  try {
    const res = await API.post('/api/donor/respond-request', { request_id: requestId, action });
    showToast(res.message, 'success');
    renderDonorDashView(document.getElementById('app-view'));
  } catch (err) {
    showToast('Failed to record response.', 'error');
  }
}
