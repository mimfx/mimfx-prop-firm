import { supabase } from "./supabase-config.js";

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

function notice(message, error = false) {
  $("promoNotice").textContent = message;
  $("promoNotice").className = error ? "notice error" : "notice";
}

function localDate(value) {
  return value ? new Date(value).toLocaleString() : "No limit";
}

async function loadCodes() {
  const { data, error } = await supabase
    .from("nexora_promo_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    $("promoRows").innerHTML = '<tr><td colspan="6">Could not load codes: ' + esc(error.message) + "</td></tr>";
    return;
  }

  $("promoRows").innerHTML = data.length ? data.map((row) => {
    const discount = row.discount_type === "percent"
      ? Number(row.discount_value) + "%"
      : "$" + Number(row.discount_value).toFixed(2);
    const validity = (row.starts_at ? localDate(row.starts_at) : "Immediately") +
      "<br>to " + localDate(row.expires_at);
    const limit = row.max_redemptions == null ? "Unlimited" : row.max_redemptions;
    const exhausted = row.max_redemptions != null && row.usage_count >= row.max_redemptions;
    const status = !row.is_active ? "DISABLED" : exhausted ? "LIMIT REACHED" : "ACTIVE";
    const button = row.is_active
      ? '<button class="promo-toggle" data-id="' + row.id + '" data-active="false">Disable</button>'
      : '<button class="primary promo-toggle" data-id="' + row.id + '" data-active="true">Enable</button>';
    return "<tr><td><strong>" + esc(row.code) + "</strong></td><td>" + esc(discount) +
      "</td><td>" + validity + "</td><td>" + row.usage_count + " / " + limit +
      "</td><td>" + status + "</td><td>" + button + "</td></tr>";
  }).join("") : '<tr><td colspan="6">No promo codes created yet.</td></tr>';
}

async function boot() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    $("promoForm").hidden = true;
    notice("Sign in as the Nexora administrator to manage promo codes.", true);
    return;
  }

  const { data: allowed, error } = await supabase.rpc("is_nexora_admin");
  if (error || !allowed) {
    $("promoForm").hidden = true;
    notice("Access denied. Only an approved Nexora administrator can manage promo codes.", true);
    return;
  }

  notice("Owner access verified. Only your admin account can create, enable or disable promo codes.");
  await loadCodes();
}

$("promoType").addEventListener("change", () => {
  $("promoValue").max = $("promoType").value === "percent" ? "100" : "";
  $("promoValue").placeholder = $("promoType").value === "percent" ? "20" : "10.00";
});

$("promoForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = $("promoCode").value.trim().toUpperCase();
  const type = $("promoType").value;
  const value = Number($("promoValue").value);
  const max = $("promoMax").value ? Number($("promoMax").value) : null;
  const startRaw = $("promoStart").value;
  const expiryRaw = $("promoExpiry").value;

  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    notice("Use 3–32 letters, numbers, underscores or hyphens.", true);
    return;
  }
  if (!Number.isFinite(value) || value <= 0 || (type === "percent" && value > 100)) {
    notice(type === "percent" ? "Percentage must be between 0.01 and 100." : "Enter a valid fixed discount amount.", true);
    return;
  }
  if (max !== null && (!Number.isInteger(max) || max < 1)) {
    notice("Maximum uses must be a whole number greater than zero.", true);
    return;
  }
  const startsAt = startRaw ? new Date(startRaw) : null;
  const expiresAt = expiryRaw ? new Date(expiryRaw) : null;
  if (startsAt && expiresAt && expiresAt <= startsAt) {
    notice("Expiry must be later than the start date.", true);
    return;
  }

  $("createPromo").disabled = true;
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("nexora_promo_codes").insert({
    code,
    discount_type: type,
    discount_value: value,
    starts_at: startsAt ? startsAt.toISOString() : null,
    expires_at: expiresAt ? expiresAt.toISOString() : null,
    max_redemptions: max,
    created_by: user.id,
    is_active: true
  });
  $("createPromo").disabled = false;

  if (error) {
    notice(error.code === "23505" ? "That promo code already exists. Choose a different code." : "Could not create promo code: " + error.message, true);
    return;
  }

  $("promoForm").reset();
  $("promoValue").max = "100";
  notice("Promo code " + code + " created. It is now controlled from this admin center.");
  await loadCodes();
});

$("promoRows").addEventListener("click", async (event) => {
  const button = event.target.closest(".promo-toggle");
  if (!button) return;
  const active = button.dataset.active === "true";
  if (!confirm((active ? "Enable" : "Disable") + " this promo code?")) return;
  button.disabled = true;
  const { error } = await supabase.from("nexora_promo_codes")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", button.dataset.id);
  if (error) {
    notice("Could not update promo code: " + error.message, true);
    button.disabled = false;
    return;
  }
  notice(active ? "Promo code enabled." : "Promo code disabled.");
  await loadCodes();
});

boot().catch((error) => notice("Promo center error: " + error.message, true));
