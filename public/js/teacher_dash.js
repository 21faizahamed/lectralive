import { initThemeToggle } from "./ui-theme.js";
import { onAuth, logoutUser } from "./auth.js";
import { getUserProfile } from "./users.js";
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();

    const createRoomBtn = document.getElementById("create-room-btn");
    const navSignoutBtn = document.getElementById("nav-signout-btn");
    const dashboardName = document.getElementById("dashboard-name");
    const createError = document.getElementById("create-error");

    let currentUser = null;

    const fetchClassrooms = async (uid) => {
        const listEl = document.getElementById("classrooms-list");
        if (!listEl) return;
        
        listEl.innerHTML = "<p style='color: var(--text-muted);'>Loading classrooms...</p>";
        
        try {
            const q = query(collection(db, "rooms"), where("teacherUid", "==", uid));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                listEl.innerHTML = "<p style='color: var(--text-muted); font-style: italic;'>No past classrooms yet.</p>";
                return;
            }
            
            let rooms = [];
            querySnapshot.forEach((docSnap) => {
                rooms.push({ id: docSnap.id, ...docSnap.data() });
            });
            
            // Sort by createdAt descending
            rooms.sort((a, b) => {
                const tA = a.createdAt?.toMillis() || 0;
                const tB = b.createdAt?.toMillis() || 0;
                return tB - tA;
            });
            
            listEl.innerHTML = "";
            rooms.forEach((data) => {
                const ts = data.createdAt?.toDate ? data.createdAt.toDate() : null;
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
                    <span style="font-weight: 600; font-size: 1.1rem; color: var(--primary);">Room: ${data.id}</span>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">Created: ${dateStr}</span>
                `;
                btn.onclick = () => window.location.href = `classroom.html?room=${encodeURIComponent(data.id)}`;
                
                listEl.appendChild(btn);
            });
            
        } catch (err) {
            console.error("Error fetching past classrooms:", err);
            listEl.innerHTML = "<p style='color: #ef4444;'>Failed to load classrooms.</p>";
        }
    };

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

            fetchClassrooms(user.uid);
        } catch (err) {
            console.error("Error fetching profile", err);
        }
    });
});
