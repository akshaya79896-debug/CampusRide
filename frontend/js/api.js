/**
 * CampusRide - API Client
 * Reusable wrapper around standard Fetch API with authentication injection
 */

const API = {
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const token = Auth.getToken();

    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // If 401 unauthorized and user had a token, session may have expired
        if (response.status === 401 && token) {
          console.warn("Session expired or invalid. Clearing credentials.");
          // Only clear if on a protected page
          if (!window.location.pathname.endsWith("login.html") && !window.location.pathname.endsWith("register.html")) {
            Auth.clearSession();
            window.location.href = `login.html?session_expired=1`;
          }
        }

        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`API Error [${options.method || "GET"} ${endpoint}]:`, err.message);
      throw err;
    }
  },

  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const path = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(path, { method: "GET" });
  },

  post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }
};

window.API = API;
