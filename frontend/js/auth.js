/**
 * CampusRide - Authentication & Session Management
 */

const Auth = {
  TOKEN_KEY: "campusride_token",
  USER_KEY: "campusride_user",

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    try {
      const userStr = localStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  },

  setSession(token, user) {
    if (token) localStorage.setItem(this.TOKEN_KEY, token);
    if (user) localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  isLoggedIn() {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user);
  },

  isAdmin() {
    const user = this.getUser();
    return !!(user && user.role === "ADMIN");
  },

  logout() {
    this.clearSession();
    window.location.href = "login.html";
  },

  requireAuth(redirectBack = true) {
    if (!this.isLoggedIn()) {
      const current = encodeURIComponent(window.location.pathname + window.location.search);
      const target = redirectBack ? `login.html?redirect=${current}` : "login.html";
      window.location.href = target;
      return false;
    }
    return true;
  },

  requireAdmin() {
    if (!this.requireAuth()) return false;
    if (!this.isAdmin()) {
      alert("Access Denied: Administrator access required.");
      window.location.href = "dashboard.html";
      return false;
    }
    return true;
  },

  async refreshUser() {
    if (!this.isLoggedIn()) return null;
    try {
      const res = await API.get("/auth/me");
      if (res && res.success && res.user) {
        this.setSession(null, res.user);
        return res.user;
      }
    } catch (err) {
      if (err.status === 401) {
        this.clearSession();
      }
    }
    return this.getUser();
  }
};

window.Auth = Auth;
