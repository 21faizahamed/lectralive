// ===============================
// DOM CONTENT LOADED
// ===============================
document.addEventListener('DOMContentLoaded', () => {

    console.log("Firebase DB:", window.db);

    // ---------------------------
    // Theme Toggle Logic
    // ---------------------------
    const themeToggleBtn = document.getElementById('theme-toggle');

    if (themeToggleBtn) {
        const sunIcon = themeToggleBtn.querySelector('.sun-icon');
        const moonIcon = themeToggleBtn.querySelector('.moon-icon');

        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (sunIcon) sunIcon.style.display = 'block';
            if (moonIcon) moonIcon.style.display = 'none';
        }

        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                if (sunIcon) sunIcon.style.display = 'none';
                if (moonIcon) moonIcon.style.display = 'block';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                if (sunIcon) sunIcon.style.display = 'block';
                if (moonIcon) moonIcon.style.display = 'none';
            }
        });
    }

    // ---------------------------
    // Auth Tabs Logic
    // ---------------------------
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            authTabs.forEach(t => t.classList.remove('active'));
            authForms.forEach(f => f.classList.remove('active'));

            tab.classList.add('active');
            const targetForm = document.getElementById(`${tab.dataset.tab}-form`);
            if (targetForm) targetForm.classList.add('active');
        });
    });

    // ---------------------------
    // Q&A Input Button Activation
    // ---------------------------
    const qaInput = document.getElementById('qa-input');
    const submitBtn = document.querySelector('.submit-btn');

    if (qaInput && submitBtn) {
        qaInput.addEventListener('input', (e) => {
            if (e.target.value.trim().length > 0) {
                submitBtn.classList.add('active');
            } else {
                submitBtn.classList.remove('active');
            }
        });
    }

    // ---------------------------
    // FIRESTORE REAL-TIME LISTENER
    // ---------------------------
    if (window.db) {
        const feed = document.getElementById('qa-feed');

        const q = window.query(
            window.collection(window.db, "questions"),
            window.orderBy("createdAt", "asc")
        );

        window.onSnapshot(q, (snapshot) => {
            if (!feed) return;

            feed.innerHTML = "";

            snapshot.forEach(doc => {
                const data = doc.data();

                const msgDiv = document.createElement('div');
                msgDiv.className = 'qa-message';

                const time = data.createdAt?.seconds
                    ? new Date(data.createdAt.seconds * 1000)
                        .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                    : '';

                msgDiv.innerHTML = `
                    <div class="qa-meta">
                        <span class="qa-author">${data.author}</span>
                        <span class="qa-time">${time}</span>
                    </div>
                    <p>${data.text}</p>
                `;

                feed.appendChild(msgDiv);
            });

            feed.scrollTop = feed.scrollHeight;
        });
    }

});


// ===============================
// VIEW SWITCHING
// ===============================
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// Make functions available globally for HTML onclick
window.switchView = switchView;
window.submitQuestion = submitQuestion;

// ===============================
// SUBMIT QUESTION TO FIRESTORE
// ===============================
async function submitQuestion() {
    const input = document.getElementById('qa-input');
    const isAnon = document.getElementById('anon-toggle')?.checked;
    const text = input?.value.trim();

    if (!text) return;

    try {
        await window.addDoc(
            window.collection(window.db, "questions"),
            {
                text: text,
                author: isAnon ? "Anonymous" : "Student",
                createdAt: new Date()
            }
        );

        input.value = '';
        document.querySelector('.submit-btn')?.classList.remove('active');

    } catch (error) {
        console.error("Error adding question:", error);
    }
}

// ---- Dummy Q&A Submit Logic Old----
// function submitQuestion() {
//     const input = document.getElementById('qa-input');
//     const isAnon = document.getElementById('anon-toggle').checked;
//     const feed = document.getElementById('qa-feed');
//     const text = input.value.trim();

//     if (!text) return;

//     // Format current time
//     const now = new Date();
//     const timeString = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

//     // Create new message element
//     const msgDiv = document.createElement('div');
//     msgDiv.className = 'qa-message';
//     msgDiv.innerHTML = `
//         <div class="qa-meta">
//             <span class="qa-author">${isAnon ? 'Anonymous' : 'Student'}</span>
//             <span class="qa-time">${timeString}</span>
//         </div>
//         <p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
//     `;

//     // Add to feed
//     feed.appendChild(msgDiv);

//     // Scroll to bottom
//     feed.scrollTop = feed.scrollHeight;

//     // Reset input
//     input.value = '';
//     document.querySelector('.submit-btn').classList.remove('active');

//     // Update active count
//     const activeCountSpan = document.querySelector('.active-count');
//     const currentCount = parseInt(activeCountSpan.textContent) || 2;
//     activeCountSpan.textContent = `${currentCount + 1} Active`;
// }


//   // Import the functions you need from the SDKs you need
//   import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
//   import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";
//   // TODO: Add SDKs for Firebase products that you want to use
//   // https://firebase.google.com/docs/web/setup#available-libraries

//   // Your web app's Firebase configuration
//   // For Firebase JS SDK v7.20.0 and later, measurementId is optional
//   const firebaseConfig = {
// apiKey: "AIzaSyD9CoVWGcQMZm0g9i8p385VLYimqq1vpHk",
// authDomain: "lectralive.firebaseapp.com",
// projectId: "lectralive",
// storageBucket: "lectralive.firebasestorage.app",
// messagingSenderId: "145968401982",
// appId: "1:145968401982:web:d10f4ba3d32fb3f7de4b6f",
// measurementId: "G-MQWXDBFE9S"
//   };

//   // Initialize Firebase
//   const app = initializeApp(firebaseConfig);
//   const analytics = getAnalytics(app);