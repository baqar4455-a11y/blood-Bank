/**
 * RABTA - Comprehensive Administrator Dashboard
 * Brand: RABTA
 */

let activeAdminTab = 'overview';

async function renderAdminDashView(container) {
  const user = State.currentUser;
  if (!user || user.role !== 'admin') {
    container.innerHTML = `
      <div class="container" style="text-align: center; padding: 4rem 1.5rem;">
        <div style="font-size: 2.5rem; margin-bottom: 1rem;">🔒</div>
        <h2>Administrator Access Only</h2>
        <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem;">Please sign in with authorized administrator credentials.</p>
        <button class="btn btn-primary" onclick="quickDemoLogin('admin@rabta.pk', 'Admin@12345')">Sign In as Chief Admin</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="container" style="padding: 2.5rem 1.5rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem;">
        <div>
          <div class="badge badge-red" style="margin-bottom: 0.4rem;">EXECUTIVE PORTAL</div>
          <h1 style="font-size: 1.85rem; font-weight: 800; color: #fff;">
            RABTA Platform Administration
          </h1>
          <p style="font-size: 0.88rem; color: var(--text-muted);">
            Regulate clinical screening rules, institutional verifications, pricing models, and system audits
          </p>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-dim); text-align: right;">
          Signed in as: <strong style="color: #fff;">${user.full_name}</strong><br/>
          Role: <span class="badge badge-red">CHIEF ADMINISTRATOR</span>
        </div>
      </div>

      <!-- Admin Tab Navigation -->
      <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-bottom: 2rem; overflow-x: auto;">
        <button class="btn btn-sm ${activeAdminTab === 'overview' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAdminTab('overview')">
          📊 Overview
        </button>
        <button class="btn btn-sm ${activeAdminTab === 'blood_banks' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAdminTab('blood_banks')">
          🏥 Blood Banks Verification
        </button>
        <button class="btn btn-sm ${activeAdminTab === 'users' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAdminTab('users')">
          👥 User Directory
        </button>
        <button class="btn btn-sm ${activeAdminTab === 'requests' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAdminTab('requests')">
          🩸 Requests Oversight
        </button>
        <button class="btn btn-sm ${activeAdminTab === 'packages' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAdminTab('packages')">
          💰 Packages & Fees
        </button>
        <button class="btn btn-sm ${activeAdminTab === 'screening' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAdminTab('screening')">
          ⚖️ Clinical Screening Rules
        </button>
        <button class="btn btn-sm ${activeAdminTab === 'districts' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAdminTab('districts')">
          🗺️ Districts & Cities
        </button>
        <button class="btn btn-sm ${activeAdminTab === 'audit' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAdminTab('audit')">
          🛡️ Audit Logs
        </button>
        <button class="btn btn-sm ${activeAdminTab === 'complaints' ? 'btn-primary' : 'btn-secondary'}" onclick="switchAdminTab('complaints')">
          ⚠️ Complaints
        </button>
      </div>

      <div id="admin-tab-content">
        <div style="text-align: center; padding: 3rem; color: var(--text-dim);">
          Loading tab data...
        </div>
      </div>
    </div>
  `;

  loadActiveAdminTab();
}

function switchAdminTab(tab) {
  activeAdminTab = tab;
  renderAdminDashView(document.getElementById('app-view'));
}

async function loadActiveAdminTab() {
  const content = document.getElementById('admin-tab-content');
  if (!content) return;

  try {
    if (activeAdminTab === 'overview') {
      const stats = await API.get('/api/admin/overview');
      content.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; margin-bottom: 2rem;">
          <div class="card" style="text-align: center; padding: 1.5rem;">
            <div style="font-size: 2.2rem; font-weight: 900; color: #fff;">${stats.total_users}</div>
            <div style="font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase;">Total Registered Users</div>
          </div>
          <div class="card" style="text-align: center; padding: 1.5rem;">
            <div style="font-size: 2.2rem; font-weight: 900; color: var(--green);">${stats.total_donors}</div>
            <div style="font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase;">Active Donors</div>
          </div>
          <div class="card" style="text-align: center; padding: 1.5rem;">
            <div style="font-size: 2.2rem; font-weight: 900; color: var(--amber);">${stats.pending_blood_banks}</div>
            <div style="font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase;">Pending Bank Approvals</div>
          </div>
          <div class="card" style="text-align: center; padding: 1.5rem;">
            <div style="font-size: 2.2rem; font-weight: 900; color: var(--red-primary);">PKR ${stats.total_commission_earned}</div>
            <div style="font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase;">Platform Service Revenue</div>
          </div>
        </div>

        <div class="card" style="padding: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 1rem;">
            ⚡ Urgent Administrative Actions
          </h3>
          <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.5;">
            ${stats.pending_blood_banks > 0 ? `There are <strong>${stats.pending_blood_banks} blood bank applications</strong> awaiting institutional verification.` : 'All registered blood banks have been verified.'} 
            ${stats.open_complaints > 0 ? `There are <strong>${stats.open_complaints} unresolved patient disputes</strong> requiring review.` : 'No unresolved complaints.'}
          </p>
          <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
            <button class="btn btn-primary btn-sm" onclick="switchAdminTab('blood_banks')">
              Review Blood Banks →
            </button>
            <button class="btn btn-secondary btn-sm" onclick="switchAdminTab('screening')">
              Review Clinical Safety Rules →
            </button>
          </div>
        </div>
      `;

    } else if (activeAdminTab === 'blood_banks') {
      const banks = await API.get('/api/admin/blood-banks');
      content.innerHTML = `
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #fff;">Registered Blood Bank Centers (${banks.length})</h3>
          </div>
          <div class="table-responsive">
            <table class="rabta-table">
              <thead>
                <tr>
                  <th>Organization Name</th>
                  <th>License Number</th>
                  <th>District / City</th>
                  <th>Contact Person</th>
                  <th>Package / Fee</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${banks.map(b => `
                  <tr>
                    <td style="font-weight: 700; color: #fff;">
                      ${b.official_name}
                      <div style="font-size: 0.75rem; color: var(--text-dim);">${b.account_email}</div>
                    </td>
                    <td style="font-family: monospace;">${b.license_number}</td>
                    <td>${b.district}, ${b.city}</td>
                    <td>${b.contact_person} (${b.official_phone})</td>
                    <td><span class="badge badge-amber">${b.package_name || 'BASIC'} (${b.commission_percent || 0}%)</span></td>
                    <td>
                      <span class="badge badge-${b.verification_status === 'verified' ? 'green' : (b.verification_status === 'pending' ? 'amber' : 'red')}">
                        ${b.verification_status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.35rem;">
                        ${b.verification_status !== 'verified' ? `
                          <button class="btn btn-primary btn-sm" style="font-size: 0.72rem; padding: 2px 8px;" onclick="updateBankStatus(${b.id}, 'verified')">
                            Approve
                          </button>
                        ` : ''}
                        ${b.verification_status !== 'suspended' ? `
                          <button class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 2px 8px;" onclick="updateBankStatus(${b.id}, 'suspended')">
                            Suspend
                          </button>
                        ` : `
                          <button class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 2px 8px;" onclick="updateBankStatus(${b.id}, 'verified')">
                            Reactivate
                          </button>
                        `}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

    } else if (activeAdminTab === 'users') {
      const users = await API.get('/api/admin/users');
      content.innerHTML = `
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color);">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #fff;">All Registered Accounts (${users.length})</h3>
          </div>
          <div class="table-responsive">
            <table class="rabta-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Security Action</th>
                </tr>
              </thead>
              <tbody>
                ${users.map(u => `
                  <tr>
                    <td style="font-weight: 700; color: #fff;">
                      ${u.full_name}
                      <div style="font-size: 0.75rem; color: var(--text-dim);">${u.email}</div>
                    </td>
                    <td><span class="badge badge-${u.role === 'admin' ? 'red' : (u.role === 'donor' ? 'green' : (u.role === 'blood_bank' ? 'amber' : 'blue'))}">${u.role.toUpperCase()}</span></td>
                    <td>${u.phone}</td>
                    <td><span class="badge badge-${u.status === 'active' ? 'green' : 'red'}">${u.status.toUpperCase()}</span></td>
                    <td>${new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      ${u.role !== 'admin' ? `
                        <button class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 2px 8px;" onclick="toggleUserStatus(${u.id}, '${u.status === 'active' ? 'suspended' : 'active'}')">
                          ${u.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      ` : '<span style="font-size: 0.75rem; color: var(--text-dim);">Protected</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

    } else if (activeAdminTab === 'requests') {
      const reqs = await API.get('/api/admin/requests');
      content.innerHTML = `
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color);">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #fff;">Blood Requests Audit Oversight (${reqs.length})</h3>
          </div>
          <div class="table-responsive">
            <table class="rabta-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Patient</th>
                  <th>Group</th>
                  <th>Bags</th>
                  <th>Urgency</th>
                  <th>Hospital</th>
                  <th>Requester</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                ${reqs.map(r => `
                  <tr>
                    <td style="font-weight: 700; color: #fff;">${r.request_code}</td>
                    <td>${r.patient_name}</td>
                    <td><span class="blood-badge">${r.blood_group}</span></td>
                    <td style="font-weight: 700; color: #fff;">${r.units_required}</td>
                    <td><span class="badge badge-${r.urgency === 'emergency' ? 'red' : 'amber'}">${r.urgency.toUpperCase()}</span></td>
                    <td>${r.hospital_name} (${r.district})</td>
                    <td>${r.requester_name} (${r.requester_phone})</td>
                    <td><span class="badge badge-${r.status === 'fulfilled' ? 'green' : (r.status === 'cancelled' ? 'gray' : 'blue')}">${r.status.replace(/_/g, ' ').toUpperCase()}</span></td>
                    <td>${new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

    } else if (activeAdminTab === 'packages') {
      const pkgs = await API.get('/api/admin/packages');
      content.innerHTML = `
        <div class="card" style="margin-bottom: 1.5rem; padding: 1.5rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem;">
            Blood Bank Packages & Dynamic Platform Service Fees
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">
            As required by Section 9, platform service fee percentages and subscription prices are configurable dynamically by administrators and never hardcoded. Emergency patient matching never depends on the tier purchased.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;">
          ${pkgs.map(p => `
            <div class="card" style="padding: 1.75rem; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div class="badge badge-amber" style="margin-bottom: 0.5rem;">TIER</div>
                <h3 style="font-size: 1.35rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem;">${p.name}</h3>
                <div style="font-size: 1.5rem; font-weight: 900; color: #fff; margin-bottom: 0.5rem;">
                  PKR ${p.price} <span style="font-size: 0.8rem; font-weight: 400; color: var(--text-dim);">/ month</span>
                </div>
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--green); margin-bottom: 1rem;">
                  Platform Service Fee: ${p.commission_percent}% per fulfilled request
                </div>
                <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.4;">${p.description}</p>
              </div>

              <div style="margin-top: 1.5rem;">
                <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="editPackageFeePrompt(${p.id}, '${p.name}', ${p.price}, ${p.commission_percent})">
                  ✏️ Edit Pricing & Commission %
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

    } else if (activeAdminTab === 'screening') {
      const rules = await API.get('/api/admin/screening-rules');
      content.innerHTML = `
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color);">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #fff;">Medical Screening & Safety Protocols</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Adheres strictly to licensed clinical transfusion guidelines.</p>
          </div>
          <div class="table-responsive">
            <table class="rabta-table">
              <thead>
                <tr>
                  <th>Rule Identifier</th>
                  <th>Category</th>
                  <th>Threshold Limits</th>
                  <th>Safety Description</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${rules.map(r => `
                  <tr>
                    <td style="font-weight: 700; color: #fff;">${r.rule_name}</td>
                    <td><span class="badge badge-blue">${r.rule_category.toUpperCase()}</span></td>
                    <td style="font-weight: 700; color: var(--green);">${r.min_value} - ${r.max_value}</td>
                    <td style="font-size: 0.82rem; color: var(--text-muted);">${r.description}</td>
                    <td><span class="badge badge-${r.is_active ? 'green' : 'red'}">${r.is_active ? 'ACTIVE' : 'DISABLED'}</span></td>
                    <td>
                      <button class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 2px 8px;" onclick="editScreeningRulePrompt(${r.id}, '${r.rule_name}', ${r.min_value}, ${r.max_value})">
                        Adjust
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

    } else if (activeAdminTab === 'districts') {
      const districts = await API.get('/api/admin/districts');
      content.innerHTML = `
        <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 1rem;">Add New District / City Region</h3>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <input type="text" id="new-district-name" class="form-control" placeholder="District Name (e.g. Hyderabad City)" style="max-width: 280px;" />
            <input type="text" id="new-district-city" class="form-control" value="Karachi" placeholder="City" style="max-width: 200px;" />
            <button class="btn btn-primary" onclick="addNewDistrictAction()">➕ Add District</button>
          </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); font-weight: 700; color: #fff;">
            Supported Districts (${districts.length})
          </div>
          <div class="table-responsive">
            <table class="rabta-table">
              <thead>
                <tr>
                  <th>District Name</th>
                  <th>City</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${districts.map(d => `
                  <tr>
                    <td style="font-weight: 700; color: #fff;">${d.name}</td>
                    <td>${d.city}</td>
                    <td><span class="badge badge-green">ACTIVE</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

    } else if (activeAdminTab === 'audit') {
      const logs = await API.get('/api/admin/audit-logs');
      content.innerHTML = `
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color);">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #fff;">Platform Security & Action Audit Trail</h3>
          </div>
          <div class="table-responsive">
            <table class="rabta-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>User Email</th>
                  <th>IP Address</th>
                  <th>Timestamp</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                ${logs.map(l => `
                  <tr>
                    <td><span class="badge badge-blue">${l.action}</span></td>
                    <td>${l.entity_type}</td>
                    <td>${l.user_email || 'System'}</td>
                    <td style="font-family: monospace;">${l.ip_address}</td>
                    <td>${new Date(l.created_at).toLocaleString()}</td>
                    <td style="font-size: 0.75rem; font-family: monospace; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${l.details_json || '{}'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

    } else if (activeAdminTab === 'complaints') {
      const comps = await API.get('/api/admin/complaints');
      content.innerHTML = `
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color);">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #fff;">User Disputes & Clinical Discrepancies</h3>
          </div>
          <div class="table-responsive">
            <table class="rabta-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Submitted By</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${comps.length === 0 ? `<tr><td colspan="6" style="text-align: center; padding: 2rem;">No open complaints logged.</td></tr>` : comps.map(c => `
                  <tr>
                    <td style="font-weight: 700; color: #fff;">
                      ${c.subject}
                      <div style="font-size: 0.75rem; color: var(--text-dim);">${c.description}</div>
                    </td>
                    <td>${c.full_name} (${c.user_email})</td>
                    <td><span class="badge badge-blue">${c.role.toUpperCase()}</span></td>
                    <td><span class="badge badge-${c.status === 'open' ? 'red' : 'green'}">${c.status.toUpperCase()}</span></td>
                    <td>${new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      ${c.status === 'open' ? `
                        <button class="btn btn-primary btn-sm" style="font-size: 0.72rem; padding: 2px 8px;" onclick="resolveComplaintAction(${c.id})">
                          Resolve
                        </button>
                      ` : '<span style="color: var(--green);">Resolved</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

  } catch (err) {
    showToast('Failed to load admin data.', 'error');
  }
}

async function updateBankStatus(id, status) {
  try {
    await API.put(`/api/admin/blood-banks/${id}/verify`, { status });
    showToast(`Blood bank verification updated to ${status}.`, 'success');
    loadActiveAdminTab();
  } catch (err) {
    showToast('Failed to update blood bank status.', 'error');
  }
}

async function toggleUserStatus(id, status) {
  try {
    await API.put(`/api/admin/users/${id}/status`, { status });
    showToast(`User status set to ${status}.`, 'success');
    loadActiveAdminTab();
  } catch (err) {
    showToast('Failed to update user.', 'error');
  }
}

async function editPackageFeePrompt(pkgId, name, currentPrice, currentComm) {
  const newPrice = prompt(`Enter monthly fee in PKR for package ${name}:`, currentPrice);
  if (newPrice === null) return;
  const newComm = prompt(`Enter platform service fee % for package ${name}:`, currentComm);
  if (newComm === null) return;

  try {
    await API.put(`/api/admin/packages/${pkgId}`, {
      price: parseFloat(newPrice),
      commission_percent: parseFloat(newComm)
    });
    showToast(`Package ${name} pricing updated.`, 'success');
    loadActiveAdminTab();
  } catch (err) {
    showToast('Failed to update package.', 'error');
  }
}

async function editScreeningRulePrompt(ruleId, ruleName, minV, maxV) {
  const newMin = prompt(`Enter minimum threshold for ${ruleName}:`, minV);
  if (newMin === null) return;
  const newMax = prompt(`Enter maximum threshold for ${ruleName}:`, maxV);
  if (newMax === null) return;

  try {
    await API.put(`/api/admin/screening-rules/${ruleId}`, {
      min_value: parseFloat(newMin),
      max_value: parseFloat(newMax),
      is_active: 1
    });
    showToast(`Screening rule ${ruleName} updated.`, 'success');
    loadActiveAdminTab();
  } catch (err) {
    showToast('Failed to update rule.', 'error');
  }
}

async function addNewDistrictAction() {
  const name = document.getElementById('new-district-name').value.trim();
  const city = document.getElementById('new-district-city').value.trim();
  if (!name || !city) return;

  try {
    await API.post('/api/admin/districts', { name, city });
    showToast(`District ${name} added successfully.`, 'success');
    loadActiveAdminTab();
  } catch (err) {
    showToast('Failed to add district.', 'error');
  }
}

async function resolveComplaintAction(id) {
  const notes = prompt('Enter resolution summary:', 'Investigated and resolved in compliance with transfusion standards.');
  if (!notes) return;

  try {
    await API.put(`/api/admin/complaints/${id}`, { status: 'resolved', resolution_notes: notes });
    showToast('Dispute resolved.', 'success');
    loadActiveAdminTab();
  } catch (err) {
    showToast('Failed to resolve dispute.', 'error');
  }
}
