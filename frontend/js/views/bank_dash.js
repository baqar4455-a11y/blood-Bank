/**
 * RABTA - Blood Bank Institutional Dashboard & Inventory Manager
 * Brand: RABTA
 */

async function renderBankDashView(container) {
  const user = State.currentUser;
  if (!user || user.role !== 'blood_bank') {
    container.innerHTML = `
      <div class="container" style="text-align: center; padding: 4rem 1.5rem;">
        <div style="font-size: 2.5rem; margin-bottom: 1rem;">🔒</div>
        <h2>Blood Bank Portal Sign In Required</h2>
        <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem;">Please sign in with your institution credentials to manage inventory and allocations.</p>
        <button class="btn btn-primary" onclick="openAuthModal('login')">Sign In</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="container" style="padding: 2.5rem 1.5rem;">
      <!-- Organization Header -->
      <div id="bank-header-card">
        <div style="text-align: center; padding: 2.5rem; color: var(--text-dim);">
          Loading institution details...
        </div>
      </div>

      <!-- INVENTORY MANAGEMENT SECTION -->
      <div style="margin-top: 2.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #fff;">
              📦 Blood Inventory Matrix (8 Groups)
            </h3>
            <p style="font-size: 0.82rem; color: var(--text-muted);">
              Manage confirmed and quarantined units with automatic expiration monitoring
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openAddBatchModal()">
            ➕ Add Blood Batch
          </button>
        </div>

        <div id="bank-inventory-table" class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 1.5rem; text-align: center; color: var(--text-dim);">
            Loading inventory records...
          </div>
        </div>
      </div>

      <!-- INCOMING RESERVATIONS & DISPENSING -->
      <div style="margin-top: 3.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #fff;">
              📋 Emergency Requests & Active Reservations
            </h3>
            <p style="font-size: 0.82rem; color: var(--text-muted);">
              Fulfill emergency unit allocations and record verified patient dispenses
            </p>
          </div>
        </div>

        <div id="bank-reservations-list" style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="padding: 1.5rem; text-align: center; color: var(--text-dim);">
            Loading requests...
          </div>
        </div>
      </div>

      <!-- SUBSCRIPTION & TRANSACTIONS SECTION -->
      <div style="margin-top: 3.5rem;">
        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem;">
          <div id="bank-package-card" class="card">
            <!-- Package details -->
          </div>
          <div id="bank-transactions-card" class="card" style="padding: 0; overflow: hidden;">
            <!-- Transactions log -->
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const profile = await API.get('/api/blood-bank/profile');
    const headerEl = document.getElementById('bank-header-card');

    headerEl.innerHTML = `
      <div class="card" style="border: 1px solid var(--border-light);">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1.5rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem;">
              <h1 style="font-size: 1.75rem; font-weight: 800; color: #fff;">${profile.official_name}</h1>
              <span class="badge badge-${profile.verification_status === 'verified' ? 'green' : 'amber'}">
                ${profile.verification_status.toUpperCase()}
              </span>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-muted);">
              License: <strong style="color: #fff;">${profile.license_number}</strong> | District: <strong style="color: #fff;">${profile.district}</strong> | Contact: ${profile.contact_person} (${profile.official_phone})
            </p>
            <div style="font-size: 0.78rem; color: var(--text-dim); margin-top: 4px;">
              📍 Address: ${profile.complete_address}
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${profile.latitude},${profile.longitude}" target="_blank" class="btn btn-secondary btn-sm">
              🗺️ Open Google Maps
            </a>
          </div>
        </div>
      </div>
    `;

    // Fetch and render inventory table
    const inventory = await API.get('/api/blood-bank/inventory');
    const invTable = document.getElementById('bank-inventory-table');

    if (!inventory || inventory.length === 0) {
      invTable.innerHTML = `
        <div style="padding: 2.5rem; text-align: center; color: var(--text-dim);">
          No blood units logged yet. Click "Add Blood Batch" to populate your inventory.
        </div>
      `;
    } else {
      invTable.innerHTML = `
        <div class="table-responsive">
          <table class="rabta-table">
            <thead>
              <tr>
                <th>Blood Group</th>
                <th>Available Units</th>
                <th>Reserved</th>
                <th>Batch Number</th>
                <th>Collection Date</th>
                <th>Expiry Date</th>
                <th>Safety Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${inventory.map(i => {
                const isExpired = i.computed_status === 'expired';
                return `
                  <tr>
                    <td><span class="blood-badge">${i.blood_group}</span></td>
                    <td style="font-size: 1.1rem; font-weight: 800; color: ${i.available_units > 0 ? '#fff' : 'var(--red-primary)'};">
                      ${i.available_units} Bag(s)
                    </td>
                    <td style="color: var(--amber); font-weight: 700;">${i.reserved_units}</td>
                    <td style="font-family: monospace; font-size: 0.82rem;">${i.batch_number}</td>
                    <td>${i.collection_date}</td>
                    <td>${i.expiry_date}</td>
                    <td>
                      <span class="badge badge-${isExpired ? 'red' : 'green'}">
                        ${isExpired ? 'EXPIRED' : 'CONFIRMED'}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="quickEditStock(${i.id}, ${i.available_units})">
                        ✏️ Adjust Units
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Fetch incoming requests & reservations
    const requests = await API.get('/api/blood-bank/requests');
    const resList = document.getElementById('bank-reservations-list');

    if (!requests || requests.length === 0) {
      resList.innerHTML = `
        <div class="card" style="text-align: center; padding: 2rem; color: var(--text-dim);">
          No emergency allocations or reservations currently pending.
        </div>
      `;
    } else {
      resList.innerHTML = requests.map(r => `
        <div class="card" style="padding: 1.5rem; border: 1px solid ${r.reservation_status === 'confirmed' ? 'var(--amber)' : 'var(--border-color)'};">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem;">
                <span class="blood-badge">${r.blood_group}</span>
                <span style="font-weight: 800; font-size: 1.15rem; color: #fff;">${r.request_code}</span>
                <span class="badge badge-${r.urgency === 'emergency' ? 'red' : 'amber'}">${r.urgency.toUpperCase()}</span>
                ${r.reservation_id ? `<span class="badge badge-amber">RESERVED: ${r.units_reserved} BAGS</span>` : ''}
              </div>
              <div style="font-size: 0.88rem; color: var(--text-muted);">
                Patient: <strong style="color: #fff;">${r.patient_name}</strong> | Destination Hospital: <strong style="color: #fff;">${r.hospital_name}</strong> (${r.district})
              </div>
              <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 0.25rem;">
                Required: ${r.units_required} Bag(s) | Requested for: ${new Date(r.required_datetime).toLocaleString()}
              </div>
            </div>

            <div style="display: flex; gap: 0.5rem;">
              ${!r.reservation_id ? `
                <button class="btn btn-primary btn-sm" onclick="bankReserveUnitsDirect(${r.id}, '${r.blood_group}', ${r.units_required})">
                  Confirm Stock Reservation
                </button>
              ` : `
                <button class="btn btn-primary btn-sm" style="background: var(--green);" onclick="dispenseReservationAction(${r.reservation_id})">
                  ✓ Dispense & Fulfill
                </button>
              `}
            </div>
          </div>
        </div>
      `).join('');
    }

    // Render Package Card
    const pkgCard = document.getElementById('bank-package-card');
    pkgCard.innerHTML = `
      <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.5rem;">
        Institutional Subscription
      </div>
      <h3 style="font-size: 1.35rem; font-weight: 800; color: #fff; margin-bottom: 0.25rem;">
        ${profile.package_name || 'PROFESSIONAL'} TIER
      </h3>
      <div style="font-size: 0.85rem; color: var(--green); font-weight: 700; margin-bottom: 1rem;">
        Service Fee: ${profile.commission_percent || 5.0}% per eligible completed transfusion
      </div>
      <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; margin-bottom: 1.25rem;">
        Includes real-time 8-group inventory sync, emergency fallback routing, and audited transactions. Emergency patient matching is never restricted by subscription tier.
      </p>
      <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="showToast('Your institutional package is actively verified.', 'info')">
        Manage Subscription
      </button>
    `;

    // Render Transactions
    const txs = await API.get('/api/blood-bank/transactions');
    const txCard = document.getElementById('bank-transactions-card');
    if (!txs || txs.length === 0) {
      txCard.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-dim);">
          No transactions recorded yet.
        </div>
      `;
    } else {
      txCard.innerHTML = `
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); font-weight: 700; color: #fff;">
          Recent Transfusion Coordination Transactions
        </div>
        <div class="table-responsive">
          <table class="rabta-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Base Nominal Coordination</th>
                <th>Platform Service Fee</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${txs.map(t => `
                <tr>
                  <td style="font-weight: 700; color: #fff;">${t.request_code || 'Direct Allocation'}</td>
                  <td>PKR ${t.amount}</td>
                  <td style="font-weight: 700; color: var(--amber);">PKR ${t.commission_amount}</td>
                  <td><span class="badge badge-green">${t.status.toUpperCase()}</span></td>
                  <td>${new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

  } catch (err) {
    showToast('Failed to load blood bank dashboard.', 'error');
  }
}

function openAddBatchModal() {
  let modal = document.getElementById('batch-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'batch-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  const today = new Date().toISOString().slice(0, 10);
  const future = new Date();
  future.setDate(future.getDate() + 35);
  const expiryDefault = future.toISOString().slice(0, 10);

  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close-btn" onclick="document.getElementById('batch-modal').remove()">✕</button>
      <h3 style="font-size: 1.25rem; font-weight: 800; color: #fff; margin-bottom: 1.25rem;">
        ➕ Add Verified Blood Inventory Batch
      </h3>

      <form id="add-batch-form">
        <div class="form-group">
          <label class="form-label">Blood Group (ABO/Rh) *</label>
          <select id="batch-bg" class="form-control form-select" required>
            ${['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => `<option value="${bg}">${bg}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Number of Bags / Units *</label>
          <input type="number" id="batch-units" class="form-control" min="1" max="100" value="5" required />
        </div>

        <div class="form-group">
          <label class="form-label">Batch Reference Number *</label>
          <input type="text" id="batch-num" class="form-control" required value="BTC-${Math.floor(1000 + Math.random() * 9000)}" />
        </div>

        <div class="form-group">
          <label class="form-label">Collection Date *</label>
          <input type="date" id="batch-coll-date" class="form-control" value="${today}" required />
        </div>

        <div class="form-group">
          <label class="form-label">Expiry Date * (35-42 days for CPDA-1 whole blood)</label>
          <input type="date" id="batch-exp-date" class="form-control" value="${expiryDefault}" required />
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
          Log Blood Units to Live Inventory
        </button>
      </form>
    </div>
  `;

  document.getElementById('add-batch-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        blood_group: document.getElementById('batch-bg').value,
        units: parseInt(document.getElementById('batch-units').value),
        batch_number: document.getElementById('batch-num').value,
        collection_date: document.getElementById('batch-coll-date').value,
        expiry_date: document.getElementById('batch-exp-date').value
      };
      const res = await API.post('/api/blood-bank/inventory', payload);
      showToast(res.message, 'success');
      document.getElementById('batch-modal').remove();
      renderBankDashView(document.getElementById('app-view'));
    } catch (err) {
      showToast(err.message || 'Failed to add batch.', 'error');
    }
  };
}

async function quickEditStock(invId, current) {
  const count = prompt('Enter updated available unit count for this batch:', current);
  if (count === null || isNaN(count) || parseInt(count) < 0) return;

  try {
    const res = await API.put(`/api/blood-bank/inventory/${invId}`, {
      available_units: parseInt(count)
    });
    showToast(res.message, 'success');
    renderBankDashView(document.getElementById('app-view'));
  } catch (err) {
    showToast(err.message || 'Update failed.', 'error');
  }
}

async function bankReserveUnitsDirect(requestId, bloodGroup, units) {
  try {
    const res = await API.post('/api/blood-bank/reserve', {
      request_id: requestId,
      blood_group: bloodGroup,
      units: units,
      notes: 'Direct institutional reservation confirmation.'
    });
    showToast(res.message, 'success');
    renderBankDashView(document.getElementById('app-view'));
  } catch (err) {
    showToast(err.message || 'Reservation failed.', 'error');
  }
}

async function dispenseReservationAction(reservationId) {
  if (!confirm('Confirm that blood units have been cross-matched and dispensed to the hospital? This will mark the request as fulfilled.')) return;

  try {
    const res = await API.post('/api/blood-bank/dispense', {
      reservation_id: reservationId
    });
    showToast(res.message, 'success');
    renderBankDashView(document.getElementById('app-view'));
  } catch (err) {
    showToast(err.message || 'Dispense failed.', 'error');
  }
}
