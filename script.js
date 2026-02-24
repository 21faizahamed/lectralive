document.addEventListener('DOMContentLoaded', () => {
    // ---- Theme Toggle Logic ----
    const themeToggleBtn = document.getElementById('theme-toggle');
    const sunIcon = themeToggleBtn.querySelector('.sun-icon');
    const moonIcon = themeToggleBtn.querySelector('.moon-icon');

    // Check for saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }

    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    });

    // ---- Auth Tabs Logic ----
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs and forms
            authTabs.forEach(t => t.classList.remove('active'));
            authForms.forEach(f => f.classList.remove('active'));

            // Add active to clicked tab and corresponding form
            tab.classList.add('active');
            const targetForm = document.getElementById(`${tab.dataset.tab}-form`);
            if(targetForm) targetForm.classList.add('active');
        });
    });

    // ---- Q&A Input Logic ----
    const qaInput = document.getElementById('qa-input');
    const submitBtn = document.querySelector('.submit-btn');

    qaInput.addEventListener('input', (e) => {
        if (e.target.value.trim().length > 0) {
            submitBtn.classList.add('active');
        } else {
            submitBtn.classList.remove('active');
        }
    });
});

// ---- View Switching Logic ----
function switchView(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show target view
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Dummy Q&A Submit Logic ----
function submitQuestion() {
    const input = document.getElementById('qa-input');
    const isAnon = document.getElementById('anon-toggle').checked;
    const feed = document.getElementById('qa-feed');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Format current time
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    
    // Create new message element
    const msgDiv = document.createElement('div');
    msgDiv.className = 'qa-message';
    msgDiv.innerHTML = `
        <div class="qa-meta">
            <span class="qa-author">${isAnon ? 'Anonymous' : 'Student'}</span>
            <span class="qa-time">${timeString}</span>
        </div>
        <p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
    `;
    
    // Add to feed
    feed.appendChild(msgDiv);
    
    // Scroll to bottom
    feed.scrollTop = feed.scrollHeight;
    
    // Reset input
    input.value = '';
    document.querySelector('.submit-btn').classList.remove('active');
    
    // Update active count
    const activeCountSpan = document.querySelector('.active-count');
    const currentCount = parseInt(activeCountSpan.textContent) || 2;
    activeCountSpan.textContent = `${currentCount + 1} Active`;
}
