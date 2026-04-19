import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from "./firebase.js";
import { escapeHtml } from "./utils.js";

export function listenToQuestions(roomCode, feedEl, currentUserUid, onCountChange) {
    const q = query(
        collection(db, "rooms", roomCode, "questions"),
        orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snapshot) => {
        feedEl.innerHTML = "";

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();

            // Client-side privacy filtering
            const isTargetingAI = data.target === "ai" || data.target === "ai_response";
            if (isTargetingAI) {
                // Only the person who asked the AI should see the thread
                if (data.authorUid !== currentUserUid && data.targetUid !== currentUserUid) {
                    return; // hide from everyone else's feed (and professor)
                }
            }

            const ts = data.createdAt?.toDate ? data.createdAt.toDate() : null;
            const time = ts
                ? ts.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                : "";

            const isOwn = data.authorUid === currentUserUid;

            const msgDiv = document.createElement("div");
            msgDiv.className = `message-row ${isOwn ? 'row-own' : 'row-other'}`;
            msgDiv.innerHTML = `
        <div class="qa-message ${isOwn ? 'msg-own' : 'msg-other'}">
          <div class="qa-meta">
            <span class="qa-author">${escapeHtml(isOwn ? "You" : (data.author ?? "Anonymous"))}</span>
            <span class="qa-time">${escapeHtml(time)}</span>
          </div>
          <p>${escapeHtml(data.text ?? "")}</p>
        </div>
      `;

            feedEl.appendChild(msgDiv);
        });

        feedEl.scrollTop = feedEl.scrollHeight;

        if (typeof onCountChange === "function") onCountChange(snapshot.size);
    });
}

export async function submitQuestion(roomCode, text, author, authorUid, authorRole, target = "all", targetUid = null) {
    const trimmed = text.trim();
    if (!trimmed) return;

    await addDoc(collection(db, "rooms", roomCode, "questions"), {
        text: trimmed,
        author,                 // displayed name ("Anonymous" or displayName)
        authorUid: authorUid ?? null,
        authorRole: authorRole ?? null, // "student" or "teacher"
        target: target ?? "all",
        targetUid: targetUid ?? null,
        createdAt: serverTimestamp(),
    });
}