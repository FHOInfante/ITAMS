const loginForm = document.getElementById("loginForm");
const errorBox = document.getElementById("errorBox");
const errorText = document.getElementById("errorText");

// Decode a JWT's payload and check it hasn't expired yet.
// Returns false for a missing/malformed token or a missing "exp" claim.
function isTokenValid(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false;
    return payload.exp * 1000 > Date.now();
  } catch (err) {
    return false;
  }
}

// If we already have a valid session, skip the login form entirely.
const existingToken = localStorage.getItem("token");
if (isTokenValid(existingToken)) {
  window.location.href = "html/assets.html";
}

function showError(message) {
  errorText.textContent = message;
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.classList.add("hidden");
}

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  hideError();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    });

    const data = await response.json();

    // Check if login successful
    if (response.ok) {

      // Save to localStorage
      localStorage.setItem("token", data.JWT);
      localStorage.setItem("role", data.role);
      localStorage.setItem("permissions", JSON.stringify(data.permissions));
      localStorage.setItem(
        "is_password_default",
        data.is_password_default
      );
      localStorage.setItem( "name", data.name);

      console.log("Login successful!");
      console.log(data);

      console.log(localStorage.getItem("token"));
      console.log(localStorage.getItem("role"));
      console.log(localStorage.getItem("name"));
      console.log(JSON.parse(localStorage.getItem("permissions")));
      

      const isPasswordDefault =
        data.is_password_default === true ||
        data.is_password_default === "true";

      if (isPasswordDefault) {
        window.location.href = "html/changeDefaultPassword.html";
      } else {
        window.location.href = "html/assets.html";
      }

    } else {
      showError(data.message || "Login failed");
    }

  } catch (error) {
    console.error("Error:", error);
    showError("Cannot connect to server");
  }
});