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

export function listenToQuestions(roomCode, feedEl, onCountChange) {
    const q = query(
        collection(db, "rooms", roomCode, "questions"),
        orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snapshot) => {
        feedEl.innerHTML = "";

        snapshot.forEach((doc) => {
            const data = doc.data();

            const msgDiv = document.createElement("div");
            msgDiv.className = "qa-message";

            const ts = data.createdAt?.toDate ? data.createdAt.toDate() : null;
            const time = ts
                ? ts.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                : "";

            msgDiv.innerHTML = `
        <div class="qa-meta">
          <span class="qa-author">${escapeHtml(data.author ?? "Anonymous")}</span>
          <span class="qa-time">${escapeHtml(time)}</span>
        </div>
        <p>${escapeHtml(data.text ?? "")}</p>
      `;

            feedEl.appendChild(msgDiv);
        });

        feedEl.scrollTop = feedEl.scrollHeight;

        if (typeof onCountChange === "function") {
            onCountChange(snapshot.size);
        }
    });
}

export async function submitQuestion(roomCode, text, author) {
    const trimmed = text.trim();
    if (!trimmed) return;

    await addDoc(collection(db, "rooms", roomCode, "questions"), {
        text: trimmed,
        author,
        createdAt: serverTimestamp(),
    });
}