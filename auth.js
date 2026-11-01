import { supabase } from "./supabase-config.js";

const form = document.getElementById("authForm");
const tabs = [...document.querySelectorAll(".tab")];
const title = document.getElementById("title");
const intro = document.getElementById("intro");
const nameWrap = document.getElementById("nameWrap");
const passwordWrap = document.getElementById("passwordWrap");
const confirmWrap = document.getElementById("confirmWrap");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const forgotBtn = document.getElementById("forgotBtn");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");
let mode = new URLSearchParams(location.search).get("mode") || "signin";

function showMessage(text, error=false) {
  message.textContent = text;
  message.className = "message show" + (error ? " error" : "");
}
function setMode(next) {
  mode = next;
  tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.mode === next));
  nameWrap.classList.toggle("hidden", next !== "signup");
  passwordWrap.classList.toggle("hidden", next === "forgot");
  confirmWrap.classList.toggle("hidden", next !== "signup");
  password.required = next !== "forgot";
  confirmPassword.required = next === "signup";
  forgotBtn.classList.toggle("hidden", next !== "signin");
  title.innerHTML = next === "signup" ? "Start your <em>journey.</em>" : next === "forgot" ? "Reset your <em>password.</em>" : next === "reset" ? "Choose a <em>password.</em>" : "Welcome <em>back.</em>";
  intro.textContent = next === "signup" ? "Create your Nexora trader profile." : next === "forgot" ? "We will email you a secure password reset link." : next === "reset" ? "Enter a new password for your account." : "Sign in to access your Nexora trader workspace.";
  submitBtn.innerHTML = (next === "signup" ? "Create account" : next === "forgot" ? "Send reset link" : next === "reset" ? "Update password" : "Sign in") + " <span>↗</span>";
  message.className = "message";
}
tabs.forEach(tab => tab.addEventListener("click", () => { showMessage(""); setMode(tab.dataset.mode); }));
forgotBtn.addEventListener("click", () => { showMessage(""); setMode("forgot"); });
form.addEventListener("submit", async event => {
  event.preventDefault();
  submitBtn.disabled = true;
  try {
    const email = document.getElementById("email").value.trim();
    const pass = password.value;
    let result;
    if (mode === "signup") {
      if (pass !== confirmPassword.value) throw new Error("Your passwords do not match.");
      result = await supabase.auth.signUp({
        email, password: pass,
        options: { data: { full_name: document.getElementById("fullName").value.trim() }, emailRedirectTo: location.origin + "/dashboard.html" }
      });
      if (result.error) throw result.error;
      showMessage(result.data.session ? "Account created. Opening your workspace…" : "Account created. Check your email to confirm your address before signing in.");
      if (result.data.session) setTimeout(() => location.href = "dashboard.html", 900);
    } else if (mode === "forgot") {
      result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/auth.html?mode=reset" });
      if (result.error) throw result.error;
      showMessage("If an account exists for that email, a password reset link has been sent.");
    } else if (mode === "reset") {
      result = await supabase.auth.updateUser({ password: pass });
      if (result.error) throw result.error;
      showMessage("Password updated successfully. You can now sign in.");
      setMode("signin");
    } else {
      result = await supabase.auth.signInWithPassword({ email, password: pass });
      if (result.error) throw result.error;
      showMessage("Signed in. Opening your workspace…");
      setTimeout(() => location.href = "dashboard.html", 600);
    }
  } catch (error) {
    showMessage(error.message || "Something went wrong. Please try again.", true);
  } finally {
    submitBtn.disabled = false;
  }
});

setMode(mode === "reset" ? "reset" : mode === "signup" ? "signup" : "signin");
const { data: { session } } = await supabase.auth.getSession();
if (session && mode !== "reset") location.replace("dashboard.html");
