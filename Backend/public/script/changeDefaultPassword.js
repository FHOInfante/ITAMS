document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("changePasswordForm");

    const newPasswordInput = document.getElementById("newPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");

    const errorBox = document.getElementById("errorMessage");
    const requirementsBox = document.getElementById("passwordRequirements");
    const successToast = document.getElementById("successToast");
    const successToastText = document.getElementById("successToastText");

    function showSuccessToast(message) {
        successToastText.textContent = message;
        successToast.classList.remove("hidden");
    }

    function setupPasswordToggle(inputEl, buttonEl) {
        if (!inputEl || !buttonEl) return;

        buttonEl.addEventListener("click", () => {
            const isVisible = inputEl.type === "text";

            inputEl.type = isVisible ? "password" : "text";
            inputEl.classList.toggle("password-visible", !isVisible);

            buttonEl.setAttribute("aria-pressed", (!isVisible).toString());
            buttonEl.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");

            buttonEl.innerHTML = `<i data-lucide="${isVisible ? "eye" : "eye-off"}"></i>`;
            if (window.lucide) {
                lucide.createIcons();
            }
        });
    }

    setupPasswordToggle(confirmPasswordInput, document.getElementById("toggleConfirmPassword"));

    const requirements = {
        length: { el: document.getElementById("req-length"), test: (pw) => pw.length >= 8 },
        upper: { el: document.getElementById("req-upper"), test: (pw) => /[A-Z]/.test(pw) },
        lower: { el: document.getElementById("req-lower"), test: (pw) => /[a-z]/.test(pw) },
        special: { el: document.getElementById("req-special"), test: (pw) => /[^A-Za-z0-9]/.test(pw) }
    };

    function isPasswordValid(pw) {
        return Object.values(requirements).every((rule) => rule.test(pw));
    }

    function updateRequirements(pw) {
        Object.values(requirements).forEach((rule) => {
            const met = rule.test(pw);
            rule.el.setAttribute("data-met", met ? "true" : "false");
        });
    }

    newPasswordInput.addEventListener("focus", () => {
        requirementsBox.classList.remove("hidden");
    });

    newPasswordInput.addEventListener("input", () => {
        updateRequirements(newPasswordInput.value);
    });

    document.addEventListener("click", (event) => {
        const wrapper = newPasswordInput.closest(".password-field-wrapper");
        if (wrapper && !wrapper.contains(event.target)) {
            requirementsBox.classList.add("hidden");
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // reset error
        errorBox.classList.add("hidden");
        errorBox.textContent = "";

        // optional: basic validation
        if (!newPassword) {
            errorBox.textContent = "Password cannot be empty.";
            errorBox.classList.remove("hidden");
            return;
        }

        // password complexity check
        if (!isPasswordValid(newPassword)) {
            updateRequirements(newPassword);
            requirementsBox.classList.remove("hidden");
            errorBox.textContent = "Password does not meet the complexity requirements.";
            errorBox.classList.remove("hidden");
            return;
        }

        // check match
        if (newPassword !== confirmPassword) {
            errorBox.textContent = "Passwords do not match.";
            errorBox.classList.remove("hidden");
            return;
        }

        try {
            const token = localStorage.getItem("token");

            const response = await fetch("/api/user/password", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    newPassword: newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to update password");
            }

            // success → show toast, then redirect
            showSuccessToast("Password updated successfully!");

            setTimeout(() => {
                window.location.href = "assets.html";
            }, 1200);

        } catch (error) {
            errorBox.textContent = error.message;
            errorBox.classList.remove("hidden");
        }
    });
});