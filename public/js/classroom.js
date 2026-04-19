import { initThemeToggle } from "./ui-theme.js";
import { getRoomCodeFromUrl } from "./utils.js";
import { onAuth, logoutUser } from "./auth.js";
import { getUserProfile } from "./users.js";
import { listenToQuestions, submitQuestion } from "./qa.js";
import { listenToCaptions, startBroadcasting, stopBroadcasting } from "./captions.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";

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
    const captionsArea = document.getElementById("captions-area");
    const broadcastBtn = document.getElementById("broadcast-btn");

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

        if (role === "student") {
            try {
                await setDoc(doc(db, "users", user.uid, "joined_rooms", roomCode), {
                    roomCode: roomCode,
                    joinedAt: serverTimestamp()
                }, { merge: true });
            } catch (err) {
                console.error("Failed to log room join", err);
            }
        }

        // Start Q&A listener
        if (feed) {
            listenToQuestions(roomCode, feed, user.uid, (count) => {
                if (activeCount) activeCount.textContent = `${count} Active`;
            });
        }
        
        // Start Captions listener
        if (captionsArea) {
            listenToCaptions(roomCode, captionsArea);
        }

        if (role === "teacher" && broadcastBtn) {
            broadcastBtn.style.display = "flex";
            
            let isBroadcasting = false;
            broadcastBtn.addEventListener("click", async () => {
                if (!isBroadcasting) {
                    broadcastBtn.textContent = "Connecting...";
                    broadcastBtn.disabled = true;
                    try {
                        await startBroadcasting(roomCode);
                        isBroadcasting = true;
                        broadcastBtn.innerHTML = `
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.5rem;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                          Stop Broadcast
                        `;
                        broadcastBtn.style.background = "#4f46e5";
                        broadcastBtn.style.borderColor = "#4338ca";
                    } catch (err) {
                        alert("Failed to start broadcasting.");
                    } finally {
                        broadcastBtn.disabled = false;
                    }
                } else {
                    await stopBroadcasting();
                    isBroadcasting = false;
                    broadcastBtn.innerHTML = `
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.5rem;"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                      Start Broadcast
                    `;
                    broadcastBtn.style.background = "#e11d48";
                    broadcastBtn.style.borderColor = "#be123c";
                }
            });
        }
        if (role === "teacher") {
            const qaTarget = document.getElementById("qa-target");
            if (qaTarget) qaTarget.style.display = "none";
            if (input) input.placeholder = "Send message to class...";
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
            const qaTarget = document.getElementById("qa-target");
            const targetVal = qaTarget ? qaTarget.value : "ai";

            if (role === "teacher" || targetVal === "professor") {
                // Route directly to class/professor
                await submitQuestion(roomCode, text, authorToShow, user.uid, role);
            } else {
                // Route to AI RAG
                await submitQuestion(roomCode, `(To AI): ${text}`, authorToShow, user.uid, role);
                
                try {
                    const res = await fetch("http://localhost:8000/api/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ question: text, room_id: roomCode, target: targetVal })
                    });
                    const data = await res.json();
                    
                    if (data.answer) {
                        await submitQuestion(roomCode, data.answer, "LectraLive AI", null, "ai");
                    }
                } catch (e) {
                    console.error("RAG Error:", e);
                    await submitQuestion(roomCode, "**Server Offline.** Could not reach AI.", "LectraLive AI", null, "ai");
                }
            }

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