import { initThemeToggle } from "./ui-theme.js";
import { onAuth, logoutUser } from "./auth.js";
import { getUserProfile } from "./users.js";

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();

    const roomInput = document.getElementById("room-code-input");
    const joinBtn = document.getElementById("join-btn");
    const navSignoutBtn = document.getElementById("nav-signout-btn");
    const dashboardName = document.getElementById("dashboard-name");

    const goToRoom = () => {
        const roomCode = (roomInput?.value || "").trim();
        if (roomCode) {
            window.location.href = `classroom.html?room=${encodeURIComponent(roomCode)}`;
        }
    };

    joinBtn?.addEventListener("click", goToRoom);
    roomInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") goToRoom();
    });

    navSignoutBtn?.addEventListener("click", async () => {
        await logoutUser();
        window.location.href = "index.html";
    });

    // Enforce auth
    onAuth(async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        try {
            const profile = await getUserProfile(user.uid);

            // If they are a teacher, redirect them to the teacher dash
            if (profile?.role === "teacher") {
                window.location.href = "teacher_dashboard.html";
                return;
            }

            if (dashboardName) {
                dashboardName.textContent = profile?.displayName || user.email;
            }
        } catch (err) {
            console.error("Error fetching profile", err);
        }
    });
});
