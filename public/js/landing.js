import { initThemeToggle } from "./ui-theme.js";
import { initAuthTabs } from "./ui-auth-tabs.js";

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    initAuthTabs();

    const roomInput = document.getElementById("room-code-input");
    const joinBtn = document.getElementById("join-btn");

    const goToRoom = () => {
        const roomCode = (roomInput?.value || "").trim();
        if (!roomCode) return;

        window.location.href = `/classroom.html?room=${encodeURIComponent(roomCode)}`;
    };

    joinBtn?.addEventListener("click", goToRoom);

    roomInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") goToRoom();
    });

    // Optional: keep forms as "demo" but prevent refresh
    document.getElementById("login-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        goToRoom();
    });

    document.getElementById("register-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        goToRoom();
    });
});