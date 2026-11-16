/**
 * RABTA - Authentication Modal with Quick Demo Switcher
 * Brand: RABTA
 */

function openAuthModal(defaultTab = 'login') {
  let modal = document.getElementById('auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close-btn" onclick="closeAuthModal()">✕</button>

      <div style="text-align: center; margin-bottom: 1.5rem;">
        <div style="font-size: 1.6rem; font-weight: 800; color: #fff;">
          RABTA<span style="color: var(--red-primary);">.</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
          Connecting Lives. One Donation at a Time.
        </p>
      </div>

      <!-- Tab Buttons -->
      <div style="display: flex; border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem;">
        <button id="tab-login-btn" class="btn btn-sm ${defaultTab === 'login' ? 'btn-primary' : 'btn-secondary'}" style="flex: 1; border-radius: var(--radius-sm) var(--radius-sm) 0 0;" onclick="switchAuthTab('login')">
          Sign In
        </button>
        <button id="tab-register-btn" class="btn btn-sm ${defaultTab === 'register' ? 'btn-primary' : 'btn-secondary'}" style="flex: 1; border-radius: var(--radius-sm) var(--radius-sm) 0 0;" onclick="switchAuthTab('register')">
          Register New Account
        </button>
      </div>

      <!-- Quick Demo Login Presets -->
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px dashed var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem;">
        <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); margin-bottom: 0.6rem; font-weight: 700;">
          ⚡ Instant One-Click Evaluation Logins
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" onclick="quickDemoLogin('admin@rabta.pk', 'Admin@12345')">
            👑 Chief Admin
          </button>
          <button class="btn btn-secondary btn-sm" onclick="quickDemoLogin('indus.bb@rabta.pk', 'Bank@12345')">
            🏥 Indus Blood Bank
          </button>
          <button class="btn btn-secondary btn-sm" onclick="quickDemoLogin('donor.ali@rabta.pk', 'Donor@123')">
            🩸 Ali Raza (O- Donor)
          </button>
          <button class="btn btn-secondary btn-sm" onclick="quickDemoLogin('requester@rabta.pk', 'Requester@123')">
            🧑 Tariq (Requester)
          </button>
        </div>
      </div>

      <!-- Login Form -->
      <div id="auth-login-pane" style="${defaultTab === 'login' ? 'display: block;' : 'display: none;'}">
        <form id="login-form">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" id="login-email" class="form-control" required placeholder="e.g. name@domain.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="login-password" class="form-control" required placeholder="••••••••" />
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">
            Sign In to RABTA
          </button>
        </form>
      </div>

      <!-- Register Role Selector -->
      <div id="auth-register-pane" style="${defaultTab === 'register' ? 'display: block;' : 'display: none;'}">
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
          Select your registration role to begin:
        </p>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <a href="#/request-blood" onclick="closeAuthModal()" class="card" style="padding: 1rem; text-decoration: none; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-weight: 700; color: #fff;">🧑 Blood Requester</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">In need of blood for a patient</div>
            </div>
            <span class="btn btn-secondary btn-sm">Start →</span>
          </a>

          <a href="#/register-donor" onclick="closeAuthModal()" class="card" style="padding: 1rem; text-decoration: none; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-weight: 700; color: #fff;">🩸 Voluntary Blood Donor</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Willing to save lives with periodic donation</div>
            </div>
            <span class="btn btn-secondary btn-sm">Register →</span>
          </a>

          <a href="#/register-bank" onclick="closeAuthModal()" class="card" style="padding: 1rem; text-decoration: none; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-weight: 700; color: #fff;">🏥 Licensed Blood Bank</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Manage institution inventory & emergency allocations</div>
            </div>
            <span class="btn btn-secondary btn-sm">Register →</span>
          </a>
        </div>
      </div>
    </div>
  `;

  // Attach submit handler
  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
      const res = await API.post('/api/auth/login', { email, password });
      State.setUser(res.user, res.token);
      showToast(`Welcome back, ${res.user.full_name}!`, 'success');
      closeAuthModal();

      // Redirect to role dashboard
      if (res.user.role === 'admin') window.location.hash = '#/admin-dashboard';
      else if (res.user.role === 'donor') window.location.hash = '#/donor-dashboard';
      else if (res.user.role === 'blood_bank') window.location.hash = '#/bank-dashboard';
      else if (res.user.role === 'requester') window.location.hash = '#/requester-dashboard';
    } catch (err) {
      showToast(err.message || 'Login failed.', 'error');
    }
  };
}

function switchAuthTab(tab) {
  const loginPane = document.getElementById('auth-login-pane');
  const registerPane = document.getElementById('auth-register-pane');
  const loginBtn = document.getElementById('tab-login-btn');
  const registerBtn = document.getElementById('tab-register-btn');

  if (tab === 'login') {
    loginPane.style.display = 'block';
    registerPane.style.display = 'none';
    loginBtn.className = 'btn btn-sm btn-primary';
    registerBtn.className = 'btn btn-sm btn-secondary';
  } else {
    loginPane.style.display = 'none';
    registerPane.style.display = 'block';
    loginBtn.className = 'btn btn-sm btn-secondary';
    registerBtn.className = 'btn btn-sm btn-primary';
  }
}

async function quickDemoLogin(email, password) {
  try {
    const res = await API.post('/api/auth/login', { email, password });
    State.setUser(res.user, res.token);
    showToast(`Signed in as ${res.user.full_name} (${res.user.role.toUpperCase()})`, 'success');
    closeAuthModal();

    if (res.user.role === 'admin') window.location.hash = '#/admin-dashboard';
    else if (res.user.role === 'donor') window.location.hash = '#/donor-dashboard';
    else if (res.user.role === 'blood_bank') window.location.hash = '#/bank-dashboard';
    else if (res.user.role === 'requester') window.location.hash = '#/requester-dashboard';
  } catch (err) {
    showToast(err.message || 'Demo login failed.', 'error');
  }
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.remove();
}
