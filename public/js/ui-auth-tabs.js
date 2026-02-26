export function initAuthTabs() {
  const authTabs = document.querySelectorAll(".auth-tab");
  const authForms = document.querySelectorAll(".auth-form");

  authTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      authTabs.forEach((t) => t.classList.remove("active"));
      authForms.forEach((f) => f.classList.remove("active"));

      tab.classList.add("active");
      const targetForm = document.getElementById(`${tab.dataset.tab}-form`);
      if (targetForm) targetForm.classList.add("active");
    });
  });
}