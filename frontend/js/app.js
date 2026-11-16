/**
 * RABTA - Main Application Router & Controller
 * Brand: RABTA
 * Tagline: Connecting Lives. One Donation at a Time.
 */

const App = {
  routes: {
    '#/': renderHomeView,
    '#/request-blood': renderRequestFormView,
    '#/register-donor': renderDonorRegView,
    '#/register-bank': renderBankRegView,
    '#/requester-dashboard': renderRequesterDashView,
    '#/donor-dashboard': renderDonorDashView,
    '#/bank-dashboard': renderBankDashView,
    '#/admin-dashboard': renderAdminDashView,
    '#/live-availability': renderLiveStockView,
    '#/blood-banks': renderBankMapView,
    '#/platform-impact': renderImpactView,
    '#/how-it-works': renderHowItWorksView,
    '#/about-rabta': renderAboutRabtaView
  },

  init() {
    // Listen for state changes (login, logout, notifications)
    State.subscribe(() => {
      renderNavbar();
    });

    // Hash change router listener
    window.addEventListener('hashchange', () => this.handleRoute());

    // Sync session and initial notification check
    State.syncSession();

    // Start background notification poll
    setInterval(() => {
      if (State.isAuthenticated) {
        State.fetchUnreadNotifications();
      }
    }, 20000);

    // Initial route handling
    this.handleRoute();
  },

  handleRoute() {
    let hash = window.location.hash || '#/';
    let params = {};

    // Parse query params in hash e.g. #/requester-dashboard?id=1
    if (hash.includes('?')) {
      const parts = hash.split('?');
      hash = parts[0];
      const searchParams = new URLSearchParams(parts[1]);
      for (const [key, value] of searchParams.entries()) {
        params[key] = value;
      }
    }

    renderNavbar();

    const viewContainer = document.getElementById('app-view');
    if (!viewContainer) return;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const routeHandler = this.routes[hash] || this.routes['#/'];
    routeHandler(viewContainer, params);
  }
};

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
