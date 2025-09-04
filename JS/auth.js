// ======================================
// 🔐 AUTH.JS – Improved error handling
// ======================================

// Toggle between forms
const container = document.getElementById("container");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

registerBtn?.addEventListener("click", () => container.classList.add("active"));
loginBtn?.addEventListener("click", () => container.classList.remove("active"));

// ✅ Removed trailing slash to avoid double-slash fetch issues
const API_URL = "https://group5backend.onrender.com";

// ======================================
// 💬 Message system
// ======================================
function showMessage(message, type = "error") {
  const el = document.getElementById("errorMessage");
  if (!el) {
    // fallback if UI element missing
    return;
  }

  el.textContent = message;
  el.className = `message ${type}`;
  el.style.display = "block";

  clearTimeout(showMessage._t);
  showMessage._t = setTimeout(() => (el.style.display = "none"), 5000);
}

const showError = (msg) => showMessage(msg, "error");
const showSuccess = (msg) => showMessage(msg, "success");

// ======================================
// 🖥️ Redirect console messages to UI (safe)
// ======================================
(function () {
  const originals = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  let inShowMessage = false; // 🚨 guard flag

  function safeShowMessage(msg, type) {
    if (inShowMessage) return; // prevent recursion
    try {
      inShowMessage = true;
      showMessage(msg, type);
    } finally {
      inShowMessage = false;
    }
  }

  console.log = function (...args) {
    safeShowMessage("ℹ️ " + args.join(" "), "success");
    originals.log.apply(console, args);
  };

  console.warn = function (...args) {
    safeShowMessage("⚠️ " + args.join(" "), "error");
    originals.warn.apply(console, args);
  };

  console.error = function (...args) {
    safeShowMessage("❌ " + args.join(" "), "error");
    originals.error.apply(console, args);
  };
})();

// ======================================
// 🔄 Safe fetch wrapper
// ======================================
async function safeFetch(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    clearTimeout(id);

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("Invalid server response");
    }

    if (!res.ok) {
      throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }

    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("⏳ Request timed out. Please try again.");
    }
    throw err;
  }
}

// ======================================
// 🔘 Button loading helper
// ======================================
function setButtonLoading(button, loading = true, defaultText = "Submit") {
  if (!button) return;
  if (loading) {
    button.disabled = true;
    button.innerHTML = `<span class="spinner"></span> Loading...`;
  } else {
    button.disabled = false;
    button.textContent = defaultText;
  }
}

// ======================================
// 📝 SIGNUP HANDLER
// ======================================
document.getElementById("signupForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = document.getElementById("signupBtn");
  const username = document.getElementById("registerUser").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPass").value;

  if (!username || !email || !password) {
    return showError("⚠️ All fields are required.");
  }

  if (password.length < 6) {
    return showError("⚠️ Password must be at least 6 characters.");
  }

  setButtonLoading(button, true, "Sign Up");

  try {
    const data = await safeFetch(`${API_URL}/register`, {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });

    showSuccess("✅ Registration successful! You can now log in.");
    container.classList.remove("active");
  } catch (err) {
    console.error("Signup Error:", err);
    showError(err.message || "❌ Registration failed. Try again.");
  } finally {
    setButtonLoading(button, false, "Sign Up");
  }
});

// ======================================
// 🔑 LOGIN HANDLER
// ======================================
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = document.getElementById("loginBtn");
  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value;

  if (!username || !password) {
    return showError("⚠️ Username and password are required.");
  }

  setButtonLoading(button, true, "Sign In");

  try {
    const data = await safeFetch(`${API_URL}/login`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    if (!data.token) {
      throw new Error("❌ Login failed: No token received.");
    }

    localStorage.setItem("todo_token", data.token);
    localStorage.setItem("todo_username", username);

    showSuccess("✅ Login successful! Redirecting...");
    setTimeout(() => (window.location.href = "app.html"), 1200);
  } catch (err) {
    console.error("Login Error:", err);
    showError(err.message || "❌ Login failed. Check credentials.");
  } finally {
    setButtonLoading(button, false, "Sign In");
  }
});

// ======================================
// 👁️ PASSWORD TOGGLE
// ======================================
document.querySelectorAll(".toggle-password").forEach((toggle) => {
  const icon = document.createElement("img");
  icon.src = "../images/visible.png";
  icon.alt = "Toggle visibility";
  icon.width = 20;
  icon.height = 20;
  toggle.appendChild(icon);

  toggle.addEventListener("click", () => {
    const targetId = toggle.getAttribute("data-target");
    const input = document.getElementById(targetId);
    if (!input) return;

    const type = input.getAttribute("type");
    if (type === "password") {
      input.setAttribute("type", "text");
      icon.src = "../images/closed.png";
    } else {
      input.setAttribute("type", "password");
      icon.src = "../images/visible.png";
    }
  });
});
