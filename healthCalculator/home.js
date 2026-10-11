(() => {
  "use strict";

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Contact form: opens the visitor's email app with the message pre-filled.
  // Change CONTACT_EMAIL to Janani's real address.
  const CONTACT_EMAIL = "hello@example.com";

  const form = document.getElementById("contact-form");
  const msg = document.getElementById("form-msg");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
      msg.style.color = "var(--danger)";
      msg.textContent = "Please enter your name and a valid email address.";
      return;
    }

    const subject = encodeURIComponent(`Coaching enquiry from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

    msg.style.color = "var(--maintain)";
    msg.textContent = "Opening your email app…";
  });
})();
