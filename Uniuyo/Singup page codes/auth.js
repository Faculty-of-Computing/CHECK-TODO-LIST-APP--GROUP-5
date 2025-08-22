    const container = document.getElementById('container');
    const registerBtn = document.getElementById('register');
    const loginBtn = document.getElementById('login');

    const BASE_URL = "https://check-todo-backend.onrender.com";

    //  Toggle UI
    registerBtn.addEventListener('click', () => {
        container.classList.add("active");
    });

    loginBtn.addEventListener('click', () => {
        container.classList.remove("active");
    });

    //  Sing Up Form Hand
    async function registerUser() {
      const username = document.getElementById("registerUser").value;
      const password = document.getElementById("registerPass").value;

      try {
        const res = await fetch({BASE_URL}/signup, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (res.ok) {
          alert("" + data.message);
        } else {
          alert(" " + (data.error || "Signup failed"));
        }
      } catch (err) {
        alert("Network error: " + err.message);
      }
    }

    // 🔹 Login Function
    async function loginUser() {
      const username = document.getElementById("loginUser").value;
      const password = document.getElementById("loginPass").value;

      try {
        const res = await fetch({BASE_URL}/login, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (res.ok) {
          alert(" " + data.message);
          if (data.token) {
            localStorage.setItem("token", data.token); // save token if backend sends it
          }
        } else {
          alert(" " + (data.error || "Login failed"));
        }
      } catch (err) {
        alert(" Network error: " + err.message);
      }
    }

    // Link buttons to backend
    registerBtn.addEventListener("click", registerUser);
    loginBtn.addEventListener("click", loginUser);
    