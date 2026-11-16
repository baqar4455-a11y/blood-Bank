/**
 * RABTA - Reactive Global Application State
 * Brand: RABTA
 */

const State = {
  currentUser: null,
  isAuthenticated: false,
  activeView: 'home',
  activeViewParams: {},
  unreadNotificationsCount: 0,
  listeners: [],

  init() {
    const cachedUser = localStorage.getItem('rabta_user');
    const token = localStorage.getItem('rabta_token');
    if (cachedUser && token) {
      try {
        this.currentUser = JSON.parse(cachedUser);
        this.isAuthenticated = true;
      } catch (e) {
        this.logout();
      }
    }
  },

  setUser(user, token) {
    this.currentUser = user;
    this.isAuthenticated = !!user;
    if (user && token) {
      localStorage.setItem('rabta_user', JSON.stringify(user));
      API.setToken(token);
    } else {
      localStorage.removeItem('rabta_user');
      API.setToken(null);
    }
    this.notify();
  },

  logout() {
    API.post('/api/auth/logout').catch(() => {});
    this.currentUser = null;
    this.isAuthenticated = false;
    localStorage.removeItem('rabta_user');
    API.setToken(null);
    this.notify();
    window.location.hash = '#/';
    showToast('You have been logged out.', 'info');
  },

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },

  notify() {
    for (const listener of this.listeners) {
      listener(this);
    }
  },

  async syncSession() {
    try {
      const data = await API.get('/api/auth/me');
      if (data.authenticated && data.user) {
        this.currentUser = data.user;
        this.isAuthenticated = true;
        localStorage.setItem('rabta_user', JSON.stringify(data.user));
      } else if (this.isAuthenticated) {
        this.setUser(null, null);
      }
    } catch (e) {
      // Offline or network error
    }
    this.fetchUnreadNotifications();
  },

  async fetchUnreadNotifications() {
    if (!this.isAuthenticated) {
      this.unreadNotificationsCount = 0;
      this.notify();
      return;
    }
    try {
      const notifs = await API.get('/api/notifications');
      const unread = notifs.filter(n => !n.is_read).length;
      this.unreadNotificationsCount = unread;
      this.notify();
    } catch (e) {
      // Silently ignore
    }
  }
};

State.init();
