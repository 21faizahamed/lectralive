import { initThemeToggle } from "./ui-theme.js";
import { initAuthTabs } from "./ui-auth-tabs.js";
import { showError } from "./utils.js";
import { registerUser, loginUser, logoutUser, onAuth } from "./auth.js";
import { getUserProfile } from "./users.js";

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    initAuthTabs();



    const loginForm = document.getElementById("login-form");
    const loginEmail = document.getElementById("login-email");
    const loginPassword = document.getElementById("login-password");
    const loginError = document.getElementById("login-error");

    const registerForm = document.getElementById("register-form");
    const registerRole = document.getElementById("register-role");
    const registerDisplayName = document.getElementById("register-displayName");
    const registerEmail = document.getElementById("register-email");
    const registerPassword = document.getElementById("register-password");
    const registerError = document.getElementById("register-error");

    const navSignoutBtn = document.getElementById("nav-signout-btn");

    // Auth UI state & Routing
    onAuth(async (user) => {
        if (user) {
            navSignoutBtn.style.display = "inline-flex";
            try {
                const profile = await getUserProfile(user.uid);
                if (profile?.role === "teacher") {
                    window.location.href = "teacher_dashboard.html";
                } else {
                    window.location.href = "student_dashboard.html";
                }
            } catch (err) {
                console.error("Error fetching user profile", err);
            }
        } else {
            navSignoutBtn.style.display = "none";
        }
    });

    navSignoutBtn?.addEventListener("click", async () => {
        await logoutUser();
    });

    // Login
    loginForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        showError(loginError, "");

        try {
            await loginUser({
                email: loginEmail.value.trim(),
                password: loginPassword.value,
            });
            // redirection is handled by onAuth

        } catch (err) {
            showError(loginError, friendlyAuthError(err));
        }
    });

    // Register
    registerForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        showError(registerError, "");

        try {
            await registerUser({
                email: registerEmail.value.trim(),
                password: registerPassword.value,
                displayName: registerDisplayName.value.trim(),
                role: registerRole.value, // student | teacher
            });
            // redirection is handled by onAuth

        } catch (err) {
            showError(registerError, friendlyAuthError(err));
        }
    });

    // Stripe Checkout Logic
    const stripeCheckoutBtn = document.getElementById("stripe-checkout-btn");
    stripeCheckoutBtn?.addEventListener("click", async () => {
        // Typically you'd initialize Stripe globally, but here we just redirect to the Checkout session URL returned by backend.
        stripeCheckoutBtn.textContent = "Loading...";
        stripeCheckoutBtn.disabled = true;
        try {
            const response = await fetch("/api/create-checkout-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url; // Redirect to Stripe Hosted Checkout
            } else {
                throw new Error(data.error || "Failed to create checkout session");
            }
        } catch (error) {
            console.error("Stripe Error:", error);
            alert("Unable to securely connect to payment provider. " + error.message);
            stripeCheckoutBtn.textContent = "Subscribe Now";
            stripeCheckoutBtn.disabled = false;
        }
    });
});

function friendlyAuthError(err) {
    console.error("Auth Error:", err);
    const code = err?.code || "";
    if (code.includes("auth/email-already-in-use")) return "That email is already registered. Try logging in.";
    if (code.includes("auth/invalid-email")) return "That email address is not valid.";
    if (code.includes("auth/weak-password")) return "Password is too weak. Use at least 6 characters.";
    if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password")) return "Incorrect email or password.";
    if (code.includes("auth/user-not-found")) return "No account found for that email.";
    return "Something went wrong: " + (err?.message || "Check the console for details.");
}