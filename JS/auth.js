// TOGGLE BETWEEN FORMS
const container = document.getElementById("container");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

registerBtn.addEventListener("click", () => {
  container.classList.add("active");
});

loginBtn.addEventListener("click", () => {
  container.classList.remove("active");
});


// BACKEND API URL
const API_URL = "https://chk-be-test2.onrender.com/"; // change this if you deploy later

// SIGNUP FORM
const signupForm = document.getElementById("signupForm");

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("registerUser").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPass").value;

  try {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("✅ Registration successful! You can now log in.");
      container.classList.remove("active"); // switch to login form
    } else {
      alert("❌ " + data.message);
    }
  } catch (err) {
    console.error("Signup Error:", err);
    alert("❌ Something went wrong. Please try again.");
  }
});

// LOGIN FORM
const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("loginUser").value;
  const password = document.getElementById("loginPass").value;

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok) {
      // Save token to localStorage
      localStorage.setItem("token", data.token);
      alert("✅ Login successful!");

      // Redirect to your tasks page (update this path to match your FE)
      window.location.href = "app.html";
    } else {
      alert("❌ " + data.message);
    }
  } catch (err) {
    console.error("Login Error:", err);
    alert("❌ Something went wrong. Please try again.");
  }
});
