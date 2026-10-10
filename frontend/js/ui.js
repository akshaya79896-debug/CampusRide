/**
 * CampusRide - Reusable UI Components & Helpers
 */

const UI = {
  // Toast notifications
  showToast(message, type = "info", duration = 3500) {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "❌";
    if (type === "warning") icon = "⚠️";

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-fade-out");
      setTimeout(() => toast.remove(), 400);
    }, duration);
  },

  // Confirmation modal dialog (Promise-based)
  showConfirm({ title = "Confirm Action", message = "Are you sure you want to proceed?", confirmText = "Confirm", cancelText = "Cancel", isDanger = false }) {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className = "modal-overlay";
      modal.innerHTML = `
        <div class="modal-card">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p>${message}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary modal-cancel">${cancelText}</button>
            <button class="btn ${isDanger ? 'btn-danger' : 'btn-primary'} modal-confirm">${confirmText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const close = (result) => {
        modal.classList.add("modal-closing");
        setTimeout(() => modal.remove(), 250);
        resolve(result);
      };

      modal.querySelector(".modal-close").addEventListener("click", () => close(false));
      modal.querySelector(".modal-cancel").addEventListener("click", () => close(false));
      modal.querySelector(".modal-confirm").addEventListener("click", () => close(true));
      modal.addEventListener("click", (e) => {
        if (e.target === modal) close(false);
      });
    });
  },

  // Format date nicely (e.g. "Mon, 12 Oct 2026")
  formatDate(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch (e) {
      return dateStr;
    }
  },

  // Format time (e.g. "08:30:00" -> "8:30 AM")
  formatTime(timeStr) {
    if (!timeStr) return "";
    try {
      const parts = timeStr.split(":");
      let hours = parseInt(parts[0]);
      const minutes = parts[1] || "00";
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  },

  // Format currency
  formatCurrency(amount) {
    const val = parseFloat(amount) || 0;
    return `₹${val.toFixed(0)}`;
  },

  // Vehicle badge helper
  getVehicleBadge(type) {
    let icon = "🚗";
    let cls = "badge-car";
    if (type === "Bike") {
      icon = "🏍️";
      cls = "badge-bike";
    } else if (type === "Auto") {
      icon = "🛺";
      cls = "badge-auto";
    }
    return `<span class="badge ${cls}"><span class="badge-icon">${icon}</span> ${type}</span>`;
  },

  // Status badge helper
  getStatusBadge(status) {
    const s = (status || "").toUpperCase();
    let cls = "badge-neutral";
    if (s === "OPEN" || s === "ACCEPTED") cls = "badge-success";
    if (s === "PENDING") cls = "badge-warning";
    if (s === "CANCELLED" || s === "REJECTED") cls = "badge-danger";
    if (s === "FULL" || s === "COMPLETED") cls = "badge-info";
    return `<span class="badge ${cls}">${s}</span>`;
  },

  // Dynamic Navigation Bar Initializer
  initNavbar(activePage = "") {
    const navContainer = document.getElementById("main-nav");
    if (!navContainer) return;

    const isLoggedIn = Auth.isLoggedIn();
    const user = Auth.getUser();
    const isAdmin = Auth.isAdmin();

    let navLinks = `
      <a href="index.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">Home</a>
      <a href="rides.html" class="nav-link ${activePage === 'rides' ? 'active' : ''}">Find Rides</a>
    `;

    if (isLoggedIn) {
      navLinks += `
        <a href="offer-ride.html" class="nav-link ${activePage === 'offer' ? 'active' : ''}">Offer a Ride</a>
        <a href="my-rides.html" class="nav-link ${activePage === 'my-rides' ? 'active' : ''}">My Rides</a>
        <a href="dashboard.html" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a>
      `;
      if (isAdmin) {
        navLinks += `
          <a href="admin.html" class="nav-link nav-admin-link ${activePage === 'admin' ? 'active' : ''}">Admin</a>
        `;
      }
    } else {
      navLinks += `
        <a href="index.html#how-it-works" class="nav-link">How it Works</a>
        <a href="index.html#safety" class="nav-link">Safety</a>
      `;
    }

    let authSection = "";
    if (isLoggedIn) {
      const initials = user.name ? user.name.charAt(0).toUpperCase() : "U";
      authSection = `
        <div class="nav-user-controls">
          <a href="notifications.html" class="nav-icon-btn ${activePage === 'notifications' ? 'active' : ''}" title="Notifications">
            🔔 <span id="nav-notif-badge" class="notif-badge" style="display: none;">0</span>
          </a>
          <div class="user-dropdown">
            <button class="user-dropdown-btn">
              <span class="avatar-circle">${initials}</span>
              <span class="user-dropdown-name">${user.name || "Student"}</span>
              <span class="dropdown-chevron">▼</span>
            </button>
            <div class="dropdown-menu">
              <div class="dropdown-header">
                <strong>${user.name}</strong>
                <small>${user.college || "CampusRide Member"}</small>
              </div>
              <div class="dropdown-divider"></div>
              <a href="dashboard.html" class="dropdown-item">📊 My Dashboard</a>
              <a href="profile.html" class="dropdown-item">👤 Profile & Reviews</a>
              <a href="my-rides.html" class="dropdown-item">🚗 My Rides & Bookings</a>
              ${isAdmin ? '<a href="admin.html" class="dropdown-item">⚡ Admin Console</a>' : ''}
              <div class="dropdown-divider"></div>
              <button onclick="Auth.logout()" class="dropdown-item dropdown-logout">🚪 Log Out</button>
            </div>
          </div>
        </div>
      `;
    } else {
      authSection = `
        <div class="nav-auth-buttons">
          <a href="login.html" class="btn btn-outline btn-sm">Log In</a>
          <a href="register.html" class="btn btn-primary btn-sm">Get Started</a>
        </div>
      `;
    }

    navContainer.innerHTML = `
      <div class="nav-wrapper container">
        <a href="index.html" class="brand-logo">
          <span class="logo-icon">🚗</span>
          <span class="brand-text">Campus<span class="brand-highlight">Ride</span></span>
        </a>

        <button class="nav-toggle" id="mobile-nav-toggle" aria-label="Toggle navigation">
          <span></span><span></span><span></span>
        </button>

        <div class="nav-menu" id="nav-menu">
          <div class="nav-links">
            ${navLinks}
          </div>
          <div class="nav-actions">
            ${authSection}
          </div>
        </div>
      </div>
    `;

    // Setup mobile toggle
    const toggleBtn = document.getElementById("mobile-nav-toggle");
    const menu = document.getElementById("nav-menu");
    if (toggleBtn && menu) {
      toggleBtn.addEventListener("click", () => {
        menu.classList.toggle("is-open");
        toggleBtn.classList.toggle("is-active");
      });
    }

    // Setup user dropdown toggle
    const dropdownBtn = document.querySelector(".user-dropdown-btn");
    const dropdownMenu = document.querySelector(".dropdown-menu");
    if (dropdownBtn && dropdownMenu) {
      dropdownBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle("show");
      });
      document.addEventListener("click", () => {
        dropdownMenu.classList.remove("show");
      });
    }

    // Update unread notifications count if logged in
    if (isLoggedIn) {
      this.updateNotificationBadge();
    }
  },

  async updateNotificationBadge() {
    if (!Auth.isLoggedIn()) return;
    try {
      const res = await API.get("/notifications");
      if (res && res.unreadCount !== undefined) {
        const badge = document.getElementById("nav-notif-badge");
        if (badge) {
          if (res.unreadCount > 0) {
            badge.textContent = res.unreadCount > 9 ? "9+" : res.unreadCount;
            badge.style.display = "inline-flex";
          } else {
            badge.style.display = "none";
          }
        }
      }
    } catch (e) {
      // Non-critical, ignore
    }
  },

  // Dynamic Footer Initializer
  initFooter() {
    const footer = document.getElementById("main-footer");
    if (!footer) return;

    footer.innerHTML = `
      <div class="container footer-content">
        <div class="footer-grid">
          <div class="footer-col brand-col">
            <div class="footer-brand">
              <span class="logo-icon">🚗</span>
              <span class="brand-text">Campus<span class="brand-highlight">Ride</span></span>
            </div>
            <p class="footer-desc">
              Safe, affordable, and student-powered carpooling & bike-pooling across colleges and universities.
            </p>
            <div class="footer-badge-pill">🎓 Open to All College Students</div>
          </div>

          <div class="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="rides.html">Find a Ride</a></li>
              <li><a href="offer-ride.html">Offer Available Seats</a></li>
              <li><a href="dashboard.html">Student Dashboard</a></li>
              <li><a href="index.html#how-it-works">How It Works</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>Popular Routes</h4>
            <ul>
              <li><a href="rides.html?source=Uppal&destination=Anurag+University">Uppal ➔ Anurag University</a></li>
              <li><a href="rides.html?source=LB+Nagar&destination=Ghatkesar">LB Nagar ➔ Ghatkesar</a></li>
              <li><a href="rides.html?source=Secunderabad&destination=Osmania">Secunderabad ➔ Osmania Univ</a></li>
              <li><a href="rides.html?source=KPHB&destination=JNTU">KPHB ➔ JNTU Campus</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>Trust & Safety</h4>
            <ul>
              <li><a href="index.html#safety">Verified Students</a></li>
              <li><a href="index.html#safety">Mutual Reviews & Ratings</a></li>
              <li><a href="profile.html">Community Guidelines</a></li>
              <li><a href="mailto:support@campusride.edu">Campus Support</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <p>&copy; ${new Date().getFullYear()} CampusRide. Built for college student mobility.</p>
          <div class="footer-status-indicator">
            <span class="status-dot online"></span>
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    `;
  }
};

window.UI = UI;
