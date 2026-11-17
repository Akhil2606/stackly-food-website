const form = document.querySelector("#account-form");
const status = document.querySelector("#account-status");
const submit = document.querySelector("#submit-account");
let mode = "login";
let busy = false;

function clearInvalidInputs() {
  document
    .querySelectorAll(".account-card input")
    .forEach((input) => input.classList.remove("input-invalid"));
}

function setMode(next) {
  if (busy) return;
  mode = next === "register" ? "register" : "login";
  const registering = mode === "register";
  document.querySelectorAll(".account-tabs [data-mode]").forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("selected", active);
    button.setAttribute("aria-pressed", String(active));
  });

  if (form.elements.name) {
    form.elements.name.disabled = !registering;
    const nameField = document.querySelector("#name-field");
    if (nameField) nameField.hidden = !registering;
  }
  if (form.elements.confirm) {
    form.elements.confirm.disabled = !registering;
    form.elements.confirm.required = registering;
    const confirmField = document.querySelector("#confirm-field");
    if (confirmField) confirmField.hidden = !registering;
    form.elements.confirm.value = "";
    form.elements.confirm.setCustomValidity("");
  }

  form.elements.password.value = "";
  form.elements.password.type = "password";
  if (form.elements.confirm) {
    form.elements.confirm.value = "";
    form.elements.confirm.type = "password";
    form.elements.confirm.setCustomValidity("");
  }
  document.querySelectorAll(".password-toggle").forEach((btn) => {
    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("aria-label", "Show password");
    btn.title = "Show password";
  });
  form.elements.password.autocomplete = registering
    ? "new-password"
    : "current-password";
  document.querySelector("#account-kicker").textContent = registering
    ? "CREATE YOUR ACCOUNT"
    : "GOOD TO SEE YOU AGAIN";
  document.querySelector("#account-title").textContent = registering
    ? "Sign Up"
    : "Welcome back.";
  document.querySelector("#account-description").textContent = registering
    ? "Register your dummy credentials below, then log in."
    : "Log in with your registered credentials.";
  submit.textContent = registering ? "Register" : "Login";
  document.querySelector("#account-switch").innerHTML = registering
    ? 'Already registered? <button type="button" data-mode="login">Go to Login</button>'
    : 'New to Stackly? <button type="button" data-mode="register">Create an account</button>';

  status.textContent = "";
  status.className = "";
  clearInvalidInputs();
  try {
    history.replaceState(null, "", registering ? "signup.html" : "login.html");
  } catch {}
}

document.querySelector(".account-card").addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (button) setMode(button.dataset.mode);
});

document.querySelectorAll(".password-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const wrap = button.closest(".password-wrap");
    const input = wrap ? wrap.querySelector("input") : form.elements.password;
    if (!input) return;
    const isVisible = input.type === "text";
    input.type = isVisible ? "password" : "text";
    const nextPressed = !isVisible;
    button.setAttribute("aria-pressed", String(nextPressed));
    const label = nextPressed ? "Hide password" : "Show password";
    button.setAttribute("aria-label", label);
    button.title = label;
  });
});

form.addEventListener("input", () => {
  clearInvalidInputs();
  if (status.classList.contains("status-invalid")) {
    status.textContent = "";
    status.className = "";
  }
});

if (form.elements.confirm) {
  form.elements.confirm.addEventListener("input", () =>
    form.elements.confirm.setCustomValidity(""),
  );
}
form.elements.password.addEventListener("input", () => {
  if (form.elements.confirm) form.elements.confirm.setCustomValidity("");
});

async function accountRequest(action, data) {
  if (!window.StacklyAccounts)
    throw new Error(
      "Account scripts could not load. Refresh this page and try again.",
    );
  return window.StacklyAccounts[action](data);
}

function showSignedIn(user) {
  document.querySelector("#signed-out").hidden = true;
  document.querySelector("#signed-in").hidden = false;
  document.querySelector("#welcome-name").textContent =
    `Welcome, ${user.name}.`;
  document.querySelector("#account-email").textContent = user.email;
  status.textContent = "";
  status.className = "";
  form.reset();
  if (typeof refreshAccountNavigation === "function")
    refreshAccountNavigation();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;
  clearInvalidInputs();
  status.className = "";

  const rawIdentifier = (form.elements.email?.value || "").trim();
  const rawPassword = form.elements.password?.value || "";
  const rawName = (form.elements.name?.value || "").trim();
  const registering = mode === "register";

  if (
    registering &&
    form.elements.confirm &&
    rawPassword !== form.elements.confirm.value
  ) {
    form.elements.confirm.setCustomValidity("Passwords do not match.");
    form.elements.confirm.reportValidity();
    form.elements.confirm.classList.add("input-invalid");
    status.textContent = "Invalid: Passwords do not match.";
    status.className = "status-invalid";
    return;
  }

  busy = true;
  submit.disabled = true;
  document
    .querySelectorAll(".account-tabs button")
    .forEach((button) => (button.disabled = true));
  status.textContent = registering
    ? "Registering credentials…"
    : "Checking credentials…";
  status.className = "";

  try {
    const data = {
      name: rawName || rawIdentifier,
      email: rawIdentifier,
      password: rawPassword,
    };

    await accountRequest(registering ? "register" : "login", data);

    if (registering) {
      busy = false;
      setMode("login");
      if (form.elements.email) form.elements.email.value = rawIdentifier;
      status.textContent =
        "Registration successful! Please log in with your registered credentials.";
      status.className = "status-success";
      form.elements.password.focus();
    } else {
      status.textContent = "Login successful! Redirecting…";
      status.className = "status-success";
      window.location.assign("location-permission.html");
    }
  } catch (error) {
    status.textContent = error.message;
    status.className = "status-invalid";
    if (!registering) {
      if (form.elements.email)
        form.elements.email.classList.add("input-invalid");
      if (form.elements.password)
        form.elements.password.classList.add("input-invalid");
    }
  } finally {
    busy = false;
    submit.disabled = false;
    document
      .querySelectorAll(".account-tabs button")
      .forEach((button) => (button.disabled = false));
  }
});

document
  .querySelector("#logout-account")
  .addEventListener("click", async (event) => {
    event.currentTarget.disabled = true;
    try {
      await accountRequest("logout", {});
      document.querySelector("#signed-in").hidden = true;
      document.querySelector("#signed-out").hidden = false;
      setMode("login");
      status.textContent = "You have been logged out.";
      status.className = "";
      if (typeof refreshAccountNavigation === "function")
        refreshAccountNavigation();
    } catch (error) {
      status.textContent = error.message;
      status.className = "status-invalid";
    } finally {
      event.currentTarget.disabled = false;
    }
  });

const forgotButton = document.querySelector("#forgot-password");
const resetSection = document.querySelector("#reset-password-section");
const resetForm = document.querySelector("#reset-password-form");
const forgotRow = document.querySelector("#forgot-password-row");
const backButton = document.querySelector("#back-to-login");

forgotButton.addEventListener("click", () => {
  if (mode !== "login") return;

  document.querySelector("#account-form").hidden = true;
  document.querySelector("#account-switch").hidden = true;
  document.querySelector("#account-kicker").hidden = true;
  document.querySelector("#account-title").hidden = true;
  document.querySelector("#account-description").hidden = true;
  document.querySelector(".account-tabs").hidden = true;

  resetSection.hidden = false;
  resetForm.elements["reset-email"].value = form.elements.email.value;
  status.textContent = "";
  status.className = "";
});

backButton.addEventListener("click", () => {
  resetSection.hidden = true;
  form.hidden = false;
  document.querySelector("#account-switch").hidden = false;
  document.querySelector("#account-kicker").hidden = false;
  document.querySelector("#account-title").hidden = false;
  document.querySelector("#account-description").hidden = false;
  document.querySelector(".account-tabs").hidden = false;

  status.textContent = "";
  status.className = "";
});

resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = resetForm.elements["reset-email"].value.trim();
  const password = resetForm.elements["new-password"].value;
  const confirmPassword = resetForm.elements["confirm-password"].value;
  const resetSubmit = resetForm.querySelector('button[type="submit"]');

  if (password !== confirmPassword) {
    status.textContent = "New passwords do not match.";
    status.className = "status-invalid";
    return;
  }

  resetSubmit.disabled = true;
  status.textContent = "Updating password...";
  status.className = "";

  try {
    await accountRequest("resetPassword", { email, password });

    resetSection.hidden = true;
    form.hidden = false;
    document.querySelector("#account-switch").hidden = false;
    document.querySelector("#account-kicker").hidden = false;
    document.querySelector("#account-title").hidden = false;
    document.querySelector("#account-description").hidden = false;
    document.querySelector(".account-tabs").hidden = false;

    setMode("login");
    form.elements.email.value = email;

    status.textContent =
      "Password reset successful! Please log in with your new password.";
    status.className = "status-success";

    resetForm.reset();
  } catch (error) {
    status.textContent = error.message;
    status.className = "status-invalid";
  } finally {
    resetSubmit.disabled = false;
  }
});

const requestedMode = new URLSearchParams(location.search).get("mode");
const isSignupPage = location.pathname.toLowerCase().includes("signup.html");
setMode(
  requestedMode === "register" || (requestedMode !== "login" && isSignupPage)
    ? "register"
    : "login",
);
const currentUser = window.StacklyAccounts?.current();
if (currentUser && !isSignupPage && requestedMode !== "register") {
  window.location.replace("dashboard.html");
}
