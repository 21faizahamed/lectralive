import { initThemeToggle } from "./ui-theme.js";
import { getRoomCodeFromUrl } from "./utils.js";
import { onAuth, logoutUser } from "./auth.js";
import { getUserProfile } from "./users.js";
import { listenToQuestions, submitQuestion } from "./qa.js";

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();

    const roomCode = getRoomCodeFromUrl("demo-room");

    const classTitle = document.getElementById("class-title");
    const connectionStatus = document.getElementById("connection-status");
    const userBadge = document.getElementById("user-badge");
    const activeCount = document.getElementById("active-count");

    const feed = document.getElementById("qa-feed");
    const input = document.getElementById("qa-input");
    const submitBtn = document.getElementById("submit-btn");
    const signoutBtn = document.getElementById("signout-btn");

    if (classTitle) classTitle.textContent = `Room: ${roomCode}`;
    if (connectionStatus) connectionStatus.textContent = "Checking login…";

    signoutBtn?.addEventListener("click", async () => {
        await logoutUser();
        window.location.href = "index.html";
    });

    // Require auth
    onAuth(async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        // Load profile (role + display name)
        const profile = await getUserProfile(user.uid);

        const displayName = profile?.displayName || user.email || "User";
        const role = profile?.role || "student";

        if (userBadge) userBadge.textContent = `${displayName} (${role})`;
        if (connectionStatus) connectionStatus.textContent = "Live";

        // Start Q&A listener
        if (feed) {
            listenToQuestions(roomCode, feed, (count) => {
                if (activeCount) activeCount.textContent = `${count} Active`;
            });
        }

        if (!input || !submitBtn) return;

        // Activate submit button on input
        input.addEventListener("input", () => {
            if (input.value.trim().length > 0) submitBtn.classList.add("active");
            else submitBtn.classList.remove("active");
        });

        const doSubmit = async () => {
            const text = input.value;
            if (!text.trim()) return;

            const authorToShow = displayName;

            await submitQuestion(roomCode, text, authorToShow, user.uid, role);

            input.value = "";
            submitBtn.classList.remove("active");
            input.focus();
        };

        submitBtn.addEventListener("click", doSubmit);

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                doSubmit();
            }
        });
    });
});