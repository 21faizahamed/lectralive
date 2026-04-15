import { initThemeToggle } from "./ui-theme.js";
import { initAuthTabs } from "./ui-auth-tabs.js";
import { showError } from "./utils.js";
import { registerUser, loginUser, logoutUser, onAuth } from "./auth.js";
import { getUserProfile } from "./users.js";
import { auth } from "./firebase.js";

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
    const navLoginBtn = document.getElementById("nav-login-btn");

    // Auth UI state & Routing
    onAuth(async (user) => {
        if (user) {
            if (navSignoutBtn) navSignoutBtn.style.display = "inline-flex";
            if (navLoginBtn) navLoginBtn.style.display = "none";
            
            try {
                const profile = await getUserProfile(user.uid);
                // Do not auto-redirect on landing page unless they are explicitly on login.html
                // But previously it auto-redirected them if they landed on index.html logged in
                // We'll leave the auto-redirection block up to you, for now we let it redirect
                if (window.location.pathname.includes("login.html")) {
                    if (profile?.role === "teacher") {
                        window.location.href = "teacher_dashboard.html";
                    } else {
                        window.location.href = "student_dashboard.html";
                    }
                }
            } catch (err) {
                console.error("Error fetching user profile", err);
            }
        } else {
            if (navSignoutBtn) navSignoutBtn.style.display = "none";
            if (navLoginBtn) navLoginBtn.style.display = "inline-flex";
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

    // Stripe Checkout Logic for all pricing plans
    const stripeCheckoutBtns = document.querySelectorAll(".stripe-checkout-btn");
    stripeCheckoutBtns.forEach(btn => {
        btn.addEventListener("click", async () => {
            if (!auth.currentUser) {
                alert("Please log in or create an account to upgrade your plan.");
                window.location.href = "login.html";
                return;
            }

            const plan = btn.getAttribute("data-plan") || "enterprise";
            const uid = auth.currentUser.uid;
            const originalText = btn.textContent;
            
            btn.textContent = "Loading...";
            btn.disabled = true;
            try {
                const response = await fetch("/api/create-checkout-session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan, uid })
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
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
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