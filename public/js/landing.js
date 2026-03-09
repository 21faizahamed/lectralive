import { initThemeToggle } from "./ui-theme.js";
import { initAuthTabs } from "./ui-auth-tabs.js";
import { showError } from "./utils.js";
import { registerUser, loginUser, logoutUser, onAuth } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    initAuthTabs();

    const roomInput = document.getElementById("room-code-input");
    const joinBtn = document.getElementById("join-btn");

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

    const goToRoom = () => {
        const roomCode = (roomInput?.value || "").trim() || "demo-room";
        window.location.href = `/classroom.html?room=${encodeURIComponent(roomCode)}`;
    };

    joinBtn?.addEventListener("click", goToRoom);
    roomInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") goToRoom();
    });

    // Auth UI state
    onAuth((user) => {
        if (user) {
            navSignoutBtn.style.display = "inline-flex";
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

            goToRoom();
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

            goToRoom();
        } catch (err) {
            showError(registerError, friendlyAuthError(err));
        }
    });
});

function friendlyAuthError(err) {
    const code = err?.code || "";
    if (code.includes("auth/email-already-in-use")) return "That email is already registered. Try logging in.";
    if (code.includes("auth/invalid-email")) return "That email address is not valid.";
    if (code.includes("auth/weak-password")) return "Password is too weak. Use at least 6 characters.";
    if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password")) return "Incorrect email or password.";
    if (code.includes("auth/user-not-found")) return "No account found for that email.";
    return "Something went wrong. Please try again.";
}