// Toggle between forms
const container = document.getElementById("container");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

registerBtn.addEventListener("click", () => container.classList.add("active"));
loginBtn.addEventListener("click", () => container.classList.remove("active"));

// ✅ Fixed: Removed trailing space in URL
const API_URL = "https://chk-be-test2.onrender.com/";

// Unified message system
function showMessage(message, type = 'error') {
  const el = document.getElementById('errorMessage');
  if (!el) return;
  el.textContent = message;
  el.className = type === 'success' ? 'success' : '';
  el.style.display = 'block';
  clearTimeout(showMessage._t);
  showMessage._t = setTimeout(() => el.style.display = 'none', 5000);
}

const showError = (msg) => showMessage(msg, 'error');
const showSuccess = (msg) => showMessage(msg, 'success');

// Show loading state on button
function setButtonLoading(button, loading = true) {
  if (loading) {
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Processing...';
  } else {
    button.disabled = false;
    button.textContent = button.classList.contains('hidden') ? 'Sign Up' : 'Sign In';
  }
}

// =========== SIGNUP HANDLER ===========
document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = document.getElementById("signupBtn");
  const username = document.getElementById("registerUser").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPass").value;

  if (password.length < 6) {
    showError("Password must be at least 6 characters.");
    return;
  }

  setButtonLoading(button, true);

  try {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (res.ok) {
      showSuccess("✅ Registration successful!\nYou can now log in.");
      container.classList.remove("active");
    } else {
      showError("❌ " + (data.message || "Registration failed"));
    }
  } catch (err) {
    console.error("Signup Error:", err);
    showError("❌ Network error. Please try again.");
  } finally {
    setButtonLoading(button, false);
  }
});

// =========== LOGIN HANDLER ===========
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = document.getElementById("loginBtn");
  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value;

  setButtonLoading(button, true);

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("todo_token", data.token);
      localStorage.setItem("todo_username", username);
      showSuccess("✅ Login successful!\nRedirecting...");
      setTimeout(() => window.location.href = "app.html", 1200);
    } else {
      showError("❌ " + (data.message || "Invalid credentials"));
    }
  } catch (err) {
    console.error("Login Error:", err);
    showError("❌ Connection failed. Check your internet.");
  } finally {
    setButtonLoading(button, false);
  }
});

// =========== PASSWORD TOGGLE (Eye Icon) ===========
document.querySelectorAll('.toggle-password').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const targetId = toggle.getAttribute('data-target');
    const input = document.getElementById(targetId);
    const type = input.getAttribute('type');
    
    if (type === 'password') {
      input.setAttribute('type', 'text');
      toggle.textContent = '🙈'; // Change to hidden eye
    } else {
      input.setAttribute('type', 'password');
      toggle.textContent = '👁️'; // Change to open eye
    }
  });
});