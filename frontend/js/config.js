/**
 * CampusRide - API Configuration
 * Supports local execution (same-origin or port 5000) and deployed production environments.
 */

const CONFIG = {
  // If hosted together with backend or behind a reverse proxy, relative '/api' works automatically.
  // If frontend is deployed separately (e.g., Netlify/Vercel), change or inject window.CAMPUSRIDE_API_URL.
  API_BASE_URL: (() => {
    if (window.CAMPUSRIDE_API_URL) {
      return window.CAMPUSRIDE_API_URL.replace(/\/$/, "");
    }
    // If running on backend server (e.g. http://localhost:5000 or production domain)
    if (window.location.port === "5000" || window.location.port === "") {
      return `${window.location.origin}/api`;
    }
    // If running from Live Server (port 5500) or static server (port 3000)
    return "http://localhost:5000/api";
  })(),

  APP_NAME: "CampusRide",
  VERSION: "1.0.0"
};

window.CONFIG = CONFIG;
