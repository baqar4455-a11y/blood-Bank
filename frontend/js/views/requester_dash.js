/**
 * RABTA - Requester Dashboard & 9-Stage Progress Tracker
 * Brand: RABTA
 */

async function renderRequesterDashView(container, params = {}) {
  const user = State.currentUser;
  if (!user) {
    container.innerHTML = `
      <div class="container" style="text-align: center; padding: 4rem 1.5rem;">
        <div style="font-size: 2.5rem; margin-bottom: 1rem;">🔒</div>
        <h2>Sign In Required</h2>
        <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem;">Please sign in to access your blood requests and real-time donor tracking.</p>
        <button class="btn btn-primary" onclick="openAuthModal('login')">Sign In</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="container" style="padding: 2.5rem 1.5rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;">
        <div>
          <div class="badge badge-blue" style="margin-bottom: 0.4rem;">REQUESTER PORTAL</div>
          <h1 style="font-size: 1.85rem; font-weight: 800; color: #fff;">
            Blood Requests & Live Donor Tracker
          </h1>
          <p style="font-size: 0.88rem; color: var(--text-muted);">
            Manage emergency patient blood requests and monitor real-time donor & blood bank matching
          </p>
        </div>
        <a href="#/request-blood" class="btn btn-primary">
          🚨 Submit New Request
        </a>
      </div>

      <div id="requester-active-section">
        <div style="text-align: center; padding: 2.5rem; color: var(--text-dim);">
          Loading your active requests...
        </div>
      </div>

      <!-- Previous Requests List -->
      <div style="margin-top: 3.5rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem;">
          Previous Requests History
        </h3>
        <div id="requester-history-table" class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 1.5rem; text-align: center; color: var(--text-dim);">
            Loading history...
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const requests = await API.get('/api/requests/my');
    const activeSection = document.getElementById('requester-active-section');
    const historyTable = document.getElementById('requester-history-table');

    if (!requests || requests.length === 0) {
      activeSection.innerHTML = `
        <div class="card" style="text-align: center; padding: 3.5rem 1.5rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🩸</div>
          <h3 style="color: #fff; margin-bottom: 0.5rem;">No Active Blood Requests</h3>
          <p style="color: var(--text-muted); max-width: 480px; margin: 0 auto 1.5rem;">
            You have not submitted any active blood requests yet. In an emergency, submit a request to immediately alert compatible donors and blood banks.
          </p>
          <a href="#/request-blood" class="btn btn-primary">
            Create First Blood Request →
          </a>
        </div>
      `;
      historyTable.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-dim);">No previous request records found.</div>`;
      return;
    }

    // Determine target active request: from query param or the most recent request
    let activeReqId = params.id ? parseInt(params.id) : requests[0].id;
    let activeReq = requests.find(r => r.id === activeReqId) || requests[0];

    // Fetch full request details (with matches and reservations)
    const reqDetail = await API.get(`/api/requests/${activeReq.id}`);
    renderActiveRequestCard(activeSection, reqDetail);

    // Render history table
    historyTable.innerHTML = `
      <div class="table-responsive">
        <table class="rabta-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Patient</th>
              <th>Group</th>
              <th>Bags</th>
              <th>Hospital</th>
              <th>Urgency</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${requests.map(r => `
              <tr>
                <td style="font-weight: 700; color: #fff;">${r.request_code}</td>
                <td>${r.patient_name}</td>
                <td><span class="blood-badge">${r.blood_group}</span></td>
                <td style="font-weight: 700; color: #fff;">${r.units_required}</td>
                <td>${r.hospital_name} (${r.district})</td>
                <td><span class="badge badge-${r.urgency === 'emergency' ? 'red' : 'amber'}">${r.urgency}</span></td>
                <td><span class="badge badge-${r.status === 'fulfilled' ? 'green' : (r.status === 'cancelled' ? 'gray' : 'blue')}">${r.status.replace(/_/g, ' ')}</span></td>
                <td>${new Date(r.created_at).toLocaleDateString()}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="window.location.hash = '#/requester-dashboard?id=${r.id}'; window.location.reload();">
                    View Tracker
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

  } catch (err) {
    showToast('Failed to load requester dashboard data.', 'error');
  }
}

function renderActiveRequestCard(container, req) {
  // 9-Stage Progress Tracker mapping
  const stages = [
    { key: 'submitted', label: '1. Request Submitted' },
    { key: 'verification_pending', label: '2. Verification' },
    { key: 'searching_donors', label: '3. Searching Donors' },
    { key: 'donors_notified', label: '4. Donors Notified' },
    { key: 'donor_response_received', label: '5. Donor Responded' },
    { key: 'searching_blood_banks', label: '6. Searching Banks' },
    { key: 'blood_bank_confirmation', label: '7. Bank Confirmed' },
    { key: 'fulfilled', label: '8. Transfusion Fulfilled' }
  ];

  const currentStatus = req.status;
  const currentIndex = stages.findIndex(s => s.key === currentStatus);

  container.innerHTML = `
    <div class="card" style="border: 1px solid var(--border-light); margin-bottom: 2rem;">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-color);">
        <div>
          <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem;">
            <span class="blood-badge" style="font-size: 1.1rem;">${req.blood_group}</span>
            <span style="font-size: 1.35rem; font-weight: 800; color: #fff;">${req.request_code}</span>
            <span class="badge badge-${req.urgency === 'emergency' ? 'red' : 'amber'}">${req.urgency.toUpperCase()}</span>
            <span class="badge badge-${req.status === 'fulfilled' ? 'green' : (req.status === 'cancelled' ? 'gray' : 'blue')}">${req.status.replace(/_/g, ' ').toUpperCase()}</span>
          </div>
          <div style="font-size: 0.92rem; color: var(--text-muted);">
            Patient: <strong style="color: #fff;">${req.patient_name}</strong> | Units: <strong style="color: #fff;">${req.units_required} Bag(s)</strong> | Hospital: <strong style="color: #fff;">${req.hospital_name}</strong> (${req.district})
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem;">
          ${req.status !== 'fulfilled' && req.status !== 'cancelled' ? `
            <button class="btn btn-outline-red btn-sm" onclick="cancelRequestPrompt(${req.id})">
              Cancel Request
            </button>
            <button class="btn btn-primary btn-sm" onclick="triggerBankFallback(${req.id})">
              🏥 Search Blood Banks
            </button>
          ` : ''}
        </div>
      </div>

      <!-- 9-Stage Progress Tracker Visual Bar -->
      <div style="margin: 2rem 0;">
        <div style="font-size: 0.85rem; font-weight: 700; color: #fff; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
          <span>Request Fulfillment Progress</span>
          <span style="font-size: 0.75rem; color: var(--text-dim);">Live State: ${req.status.replace(/_/g, ' ')}</span>
        </div>

        <div class="tracker-wrapper">
          ${stages.map((s, idx) => {
            let stateClass = '';
            if (currentStatus === 'fulfilled') {
              stateClass = 'completed';
            } else if (currentStatus === 'cancelled') {
              stateClass = idx === 0 ? 'active' : '';
            } else if (idx < currentIndex) {
              stateClass = 'completed';
            } else if (idx === currentIndex) {
              stateClass = 'active';
            }

            return `
              <div class="tracker-step ${stateClass}">
                <div class="step-circle">${stateClass === 'completed' ? '✓' : idx + 1}</div>
                <div class="step-label">${s.label}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- MATCHED DONORS SECTION -->
      <div style="margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff;">
              🎯 Intelligent Donor Matches (${req.matches ? req.matches.length : 0})
            </h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
              Donors filtered by ABO/Rh compatibility, proximity to ${req.hospital_name}, and medical screening
            </p>
          </div>
        </div>

        ${(!req.matches || req.matches.length === 0) ? `
          <div style="padding: 1.5rem; text-align: center; background: rgba(255, 255, 255, 0.02); border-radius: var(--radius-md); color: var(--text-dim);">
            No direct donor matches available currently. We recommend initiating blood bank search below.
          </div>
        ` : `
          <div class="table-responsive">
            <table class="rabta-table">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Blood Group</th>
                  <th>District</th>
                  <th>Distance</th>
                  <th>Match Suitability</th>
                  <th>Status</th>
                  <th>Phone (On Consent)</th>
                </tr>
              </thead>
              <tbody>
                ${req.matches.map(m => `
                  <tr>
                    <td style="font-weight: 700; color: #fff;">
                      ${m.full_name}
                      <div style="font-size: 0.72rem; color: var(--text-dim);">${m.total_donations_count} Verified Donations</div>
                    </td>
                    <td><span class="blood-badge">${m.blood_group}</span></td>
                    <td>${m.district}</td>
                    <td style="font-weight: 600; color: #fff;">~${m.distance_km} km</td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.4rem;">
                        <div style="flex: 1; height: 6px; background: var(--border-color); border-radius: 999px; overflow: hidden; max-width: 80px;">
                          <div style="width: ${m.match_score}%; height: 100%; background: var(--green);"></div>
                        </div>
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--green);">${m.match_score}%</span>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-${m.status === 'accepted' ? 'green' : (m.status === 'declined' ? 'red' : 'amber')}">
                        ${m.status.toUpperCase()}
                      </span>
                    </td>
                    <td style="font-size: 0.82rem; font-family: monospace;">
                      ${m.display_phone}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- FALLBACK BLOOD BANKS SECTION -->
      <div id="fallback-banks-container" style="margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff;">
              🏥 Compatible Blood Banks in Karachi
            </h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
              Verified institutions with confirmed unexpired ${req.blood_group} inventory
            </p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="triggerBankFallback(${req.id})">
            🔄 Refresh Availability
          </button>
        </div>

        <div id="fallback-banks-list" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
          <!-- Populated by fallback search -->
        </div>
      </div>
    </div>
  `;

  // Automatically trigger blood bank preview
  triggerBankFallback(req.id, false);
}

async function triggerBankFallback(requestId, showToastMsg = true) {
  try {
    const listEl = document.getElementById('fallback-banks-list');
    if (listEl) {
      listEl.innerHTML = `<div style="grid-column: span 2; text-align: center; padding: 1.5rem; color: var(--text-dim);">Searching verified blood banks...</div>`;
    }

    const res = await API.post(`/api/requests/${requestId}/fallback-to-banks`);
    if (showToastMsg) {
      showToast(res.message, 'success');
    }

    if (!listEl) return;

    if (!res.blood_banks || res.blood_banks.length === 0) {
      listEl.innerHTML = `
        <div style="grid-column: span 2; text-align: center; padding: 1.5rem; color: var(--text-dim);">
          No blood banks currently have surplus confirmed stock for this group in Karachi.
        </div>
      `;
      return;
    }

    listEl.innerHTML = res.blood_banks.map(b => `
      <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <span class="badge badge-green">VERIFIED</span>
            <span style="font-size: 0.75rem; color: var(--text-dim);">${b.distance_km} km away</span>
          </div>
          <h4 style="color: #fff; font-size: 1rem; margin: 0.5rem 0 0.25rem;">${b.official_name}</h4>
          <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">${b.address} (${b.district})</p>
          <div style="margin: 0.75rem 0; font-size: 0.85rem; color: #fff;">
            Confirmed Stock: <strong style="color: var(--green);">${b.total_available_units} Bag(s)</strong>
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
          <a href="${b.google_maps_url}" target="_blank" class="btn btn-secondary btn-sm" style="flex: 1; text-align: center;">
            🗺️ Directions
          </a>
          <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="reserveFromBankPrompt(${requestId}, ${b.blood_bank_id}, '${b.official_name}')">
            Reserve Blood
          </button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    // Silently handle
  }
}

async function reserveFromBankPrompt(requestId, bankId, bankName) {
  const units = prompt(`Enter number of bags to reserve from ${bankName}:`, '1');
  if (!units || isNaN(units) || parseInt(units) <= 0) return;

  try {
    const res = await API.post('/api/blood-bank/reserve', {
      request_id: requestId,
      units: parseInt(units),
      blood_group: 'O+', // fallback default or req group
      notes: 'Reserved via Requester Fallback Dispatch'
    });
    showToast(res.message, 'success');
    window.location.reload();
  } catch (err) {
    showToast(err.message || 'Reservation failed.', 'error');
  }
}

async function cancelRequestPrompt(requestId) {
  const reason = prompt('Please enter cancellation reason:', 'Patient received blood from another source.');
  if (!reason) return;

  try {
    const res = await API.post(`/api/requests/${requestId}/cancel`, { reason });
    showToast(res.message, 'success');
    window.location.reload();
  } catch (err) {
    showToast(err.message || 'Failed to cancel request.', 'error');
  }
}
