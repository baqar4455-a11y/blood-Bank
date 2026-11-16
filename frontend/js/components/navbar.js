/**
 * RABTA - Navigation Bar Component
 * Brand: RABTA
 */

function renderNavbar() {
  const navContainer = document.getElementById('navbar-container');
  if (!navContainer) return;

  const user = State.currentUser;
  const isAuth = State.isAuthenticated;
  const unread = State.unreadNotificationsCount;

  let roleDashboardHash = '#/request-blood';
  let roleBadge = '';
  if (user) {
    if (user.role === 'requester') {
      roleDashboardHash = '#/requester-dashboard';
      roleBadge = '<span class="badge badge-blue">Requester</span>';
    } else if (user.role === 'donor') {
      roleDashboardHash = '#/donor-dashboard';
      roleBadge = '<span class="badge badge-green">Donor</span>';
    } else if (user.role === 'blood_bank') {
      roleDashboardHash = '#/bank-dashboard';
      roleBadge = '<span class="badge badge-amber">Blood Bank</span>';
    } else if (user.role === 'admin') {
      roleDashboardHash = '#/admin-dashboard';
      roleBadge = '<span class="badge badge-red">Admin</span>';
    }
  }

  navContainer.innerHTML = `
    <header class="rabta-nav">
      <a class="nav-brand" href="#/">
        <div class="logo-icon-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
            <path d="M6 14h2.5l1.5-3 2.5 6 2-4h3.5" stroke="#FFE4E6" stroke-width="1.8"></path>
          </svg>
        </div>
        <div class="logo-text-box">
          <div class="logo-title">RABTA<span>.</span></div>
          <div class="logo-tagline">Connecting Lives</div>
        </div>
      </a>

      <button id="mobile-nav-toggle" class="btn btn-secondary btn-sm" style="display: none;" aria-label="Toggle menu">
        ☰
      </button>

      <ul class="nav-menu" id="nav-menu-links">
        <li><a class="nav-link" href="#/" data-view="home">Home</a></li>
        <li><a class="nav-link" href="#/request-blood" data-view="request-blood">Request Blood</a></li>
        <li><a class="nav-link" href="#/register-donor" data-view="register-donor">Become a Donor</a></li>
        <li><a class="nav-link" href="#/blood-banks" data-view="blood-banks">Blood Banks</a></li>
        <li><a class="nav-link" href="#/live-availability" data-view="live-availability">Live Availability</a></li>
        <li><a class="nav-link" href="#/platform-impact" data-view="platform-impact">Platform Impact</a></li>
        <li><a class="nav-link" href="#/how-it-works" data-view="how-it-works">How It Works</a></li>
        <li><a class="nav-link" href="#/about-rabta" data-view="about-rabta">About RABTA</a></li>
      </ul>

      <div class="nav-actions">
        ${isAuth ? `
          <button id="nav-notifications-btn" class="btn btn-secondary btn-sm" style="position: relative;" title="Emergency Notifications">
            🔔
            ${unread > 0 ? `<span style="position: absolute; top: -6px; right: -6px; background: var(--red-primary); color: #fff; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 999px; box-shadow: 0 0 8px var(--red-primary);">${unread}</span>` : ''}
          </button>

          <a href="${roleDashboardHash}" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; gap: 0.4rem;">
            <span>👤 ${user.full_name ? user.full_name.split(' ')[0] : 'Dashboard'}</span>
            ${roleBadge}
          </a>

          <button id="nav-logout-btn" class="btn btn-secondary btn-sm" title="Sign Out">
            🚪
          </button>
        ` : `
          <button id="nav-login-btn" class="btn btn-secondary btn-sm">
            Sign In
          </button>
          <a href="#/request-blood" class="btn btn-primary btn-sm">
            🚨 Request Blood
          </a>
        `}
      </div>
    </header>
  `;

  // Attach event listeners
  const loginBtn = document.getElementById('nav-login-btn');
  if (loginBtn) {
    loginBtn.onclick = () => openAuthModal();
  }

  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = () => State.logout();
  }

  const notifBtn = document.getElementById('nav-notifications-btn');
  if (notifBtn) {
    notifBtn.onclick = () => openNotificationsModal();
  }

  // Active link highlighting
  const currentHash = window.location.hash || '#/';
  const links = document.querySelectorAll('.nav-link');
  links.forEach(l => {
    if (l.getAttribute('href') === currentHash) {
      l.classList.add('active');
    } else {
      l.classList.remove('active');
    }
  });
}
