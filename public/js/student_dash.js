import { initThemeToggle } from "./ui-theme.js";
import { onAuth, logoutUser } from "./auth.js";
import { getUserProfile } from "./users.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();

    const roomInput = document.getElementById("room-code-input");
    const joinBtn = document.getElementById("join-btn");
    const navSignoutBtn = document.getElementById("nav-signout-btn");
    const dashboardName = document.getElementById("dashboard-name");

    const fetchJoinedClassrooms = async (uid) => {
        const listEl = document.getElementById("classrooms-list");
        if (!listEl) return;
        
        listEl.innerHTML = "<p style='color: var(--text-muted);'>Loading classrooms...</p>";
        
        try {
            const querySnapshot = await getDocs(collection(db, "users", uid, "joined_rooms"));
            
            if (querySnapshot.empty) {
                listEl.innerHTML = "<p style='color: var(--text-muted); font-style: italic;'>No past classrooms yet.</p>";
                return;
            }
            
            let rooms = [];
            querySnapshot.forEach((docSnap) => {
                rooms.push({ id: docSnap.id, ...docSnap.data() });
            });
            
            // Sort by joinedAt descending
            rooms.sort((a, b) => {
                const tA = a.joinedAt?.toMillis() || 0;
                const tB = b.joinedAt?.toMillis() || 0;
                return tB - tA;
            });
            
            listEl.innerHTML = "";
            rooms.forEach((data) => {
                const ts = data.joinedAt?.toDate ? data.joinedAt.toDate() : null;
                const dateStr = ts ? ts.toLocaleDateString() : "Unknown Date";
                
                const btn = document.createElement("button");
                btn.className = "btn btn-outline module";
                btn.style.display = "flex";
                btn.style.flexDirection = "column";
                btn.style.alignItems = "flex-start";
                btn.style.padding = "1.5rem";
                btn.style.gap = "0.5rem";
                btn.style.width = "100%";
                btn.style.textAlign = "left";
                btn.innerHTML = `
                    <span style="font-weight: 600; font-size: 1.1rem; color: var(--primary);">Room: ${data.roomCode}</span>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">Joined: ${dateStr}</span>
                `;
                btn.onclick = () => window.location.href = `classroom.html?room=${encodeURIComponent(data.roomCode)}`;
                
                listEl.appendChild(btn);
            });
            
        } catch (err) {
            console.error("Error fetching joined classrooms:", err);
            listEl.innerHTML = "<p style='color: #ef4444;'>Failed to load classrooms.</p>";
        }
    };

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

            fetchJoinedClassrooms(user.uid);
        } catch (err) {
            console.error("Error fetching profile", err);
        }
    });
});
