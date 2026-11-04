const API_BASE = "/api";

async function api(endpoint, options = {}) {
  const config = { ...options, headers: { ...(options.headers || {}) } };
  if (config.body && typeof config.body !== "string") {
    config.headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(config.body);
  }
  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : null;
  if (!response.ok)
    throw new Error(data?.mensaje || `Error HTTP ${response.status}`);
  return data;
}

const money = (value) => `S/ ${Number(value || 0).toFixed(2)}`;
const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
const formatDate = (value) => {
  if (!value) return "—";
  const parts = String(value).slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
};

function toast(message, type = "success") {
  const region = document.getElementById("toast-region");
  const item = document.createElement("div");
  item.className = `toast ${type === "error" ? "error" : ""}`;
  item.textContent = message;
  region.appendChild(item);
  setTimeout(() => item.remove(), 3500);
}

function showModal(title, description, html, wide = false) {
  const backdrop = document.getElementById("modal-backdrop");
  const modal = backdrop.querySelector(".modal");
  modal.classList.toggle("wide", wide);
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-description").textContent = description || "";
  document.getElementById("modal-content").innerHTML = html;
  backdrop.hidden = false;
}
function closeModal() {
  document.getElementById("modal-backdrop").hidden = true;
}

window.api = api;
window.money = money;
window.escapeHTML = escapeHTML;
window.formatDate = formatDate;
window.toast = toast;
window.showModal = showModal;
window.closeModal = closeModal;
