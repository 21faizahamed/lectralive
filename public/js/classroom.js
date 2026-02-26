import { initThemeToggle } from "./ui-theme.js";
import { listenToQuestions, submitQuestion } from "./qa.js";
import { getRoomCodeFromUrl } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();

    const roomCode = getRoomCodeFromUrl("demo-room");

    const classTitle = document.getElementById("class-title");
    const connectionStatus = document.getElementById("connection-status");
    const activeCount = document.getElementById("active-count");

    const feed = document.getElementById("qa-feed");
    const input = document.getElementById("qa-input");
    const anonToggle = document.getElementById("anon-toggle");
    const submitBtn = document.getElementById("submit-btn");

    if (classTitle) classTitle.textContent = `Room: ${roomCode}`;
    if (connectionStatus) connectionStatus.textContent = "Live";

    if (!feed || !input || !submitBtn) return;

    // Live listener
    listenToQuestions(roomCode, feed, (count) => {
        if (activeCount) activeCount.textContent = `${count} Active`;
    });

    // Activate button styling when typing
    input.addEventListener("input", () => {
        if (input.value.trim().length > 0) submitBtn.classList.add("active");
        else submitBtn.classList.remove("active");
    });

    // Submit
    const doSubmit = async () => {
        const text = input.value;
        const isAnon = anonToggle?.checked ?? true;
        const author = isAnon ? "Anonymous" : "Student";

        await submitQuestion(roomCode, text, author);

        input.value = "";
        submitBtn.classList.remove("active");
        input.focus();
    };

    submitBtn.addEventListener("click", doSubmit);

    // Shift+Enter newline, Enter submits
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (input.value.trim()) doSubmit();
        }
    });
});