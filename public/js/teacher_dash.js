import { initThemeToggle } from "./ui-theme.js";
import { onAuth, logoutUser } from "./auth.js";
import { getUserProfile } from "./users.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();

    const createRoomBtn = document.getElementById("create-room-btn");
    const navSignoutBtn = document.getElementById("nav-signout-btn");
    const dashboardName = document.getElementById("dashboard-name");
    const createError = document.getElementById("create-error");

    let currentUser = null;

    const generateRoomCode = () => {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `room-${result}`;
    };

    createRoomBtn?.addEventListener("click", async () => {
        if (!currentUser) return;

        try {
            createRoomBtn.disabled = true;
            createRoomBtn.innerText = "Creating...";

            const roomCode = generateRoomCode();

            // Create root document for the room in Firestore
            await setDoc(doc(db, "rooms", roomCode), {
                teacherUid: currentUser.uid,
                createdAt: serverTimestamp(),
                active: true
            });

            window.location.href = `classroom.html?room=${encodeURIComponent(roomCode)}`;
        } catch (err) {
            console.error(err);
            if (createError) {
                createError.textContent = "Failed to create room. Please try again.";
                createError.style.display = "block";
            }
            createRoomBtn.disabled = false;
            createRoomBtn.innerHTML = `
              Create New Classroom
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 0.5rem;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            `;
        }
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

        currentUser = user;

        try {
            const profile = await getUserProfile(user.uid);

            // If they are a student, redirect them to the student dash
            if (profile?.role === "student") {
                window.location.href = "student_dashboard.html";
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
