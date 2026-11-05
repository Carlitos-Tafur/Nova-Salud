const pageNames = {
  dashboard: "Dashboard",
  inventario: "Inventario",
  pos: "Punto de venta",
  ventas: "Ventas",
};
let currentPage = "dashboard";

async function mostrarPagina(page) {
  if (!pageNames[page]) return;
  currentPage = page;
  document
    .querySelectorAll(".page-section")
    .forEach((section) =>
      section.classList.toggle("active", section.id === `page-${page}`),
    );
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
    if (button.dataset.page === page)
      button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.getElementById("page-title").textContent = pageNames[page];
  setMenuOpen(false);
  if (page === "dashboard") await cargarDashboard();
  if (page === "inventario") await cargarInventario();
  if (page === "pos") {
    await cargarCatalogo();
    renderCart();
  }
  if (page === "ventas") await cargarVentas();
}

document
  .querySelectorAll(".nav-link")
  .forEach((button) =>
    button.addEventListener("click", () => mostrarPagina(button.dataset.page)),
  );
document
  .querySelectorAll("[data-go]")
  .forEach((button) =>
    button.addEventListener("click", () => mostrarPagina(button.dataset.go)),
  );
document
  .getElementById("refresh-current")
  .addEventListener("click", () => mostrarPagina(currentPage));
function setMenuOpen(open) {
  document.getElementById("sidebar").classList.toggle("open", open);
  document
    .getElementById("menu-toggle")
    .setAttribute("aria-expanded", String(open));
  document.getElementById("sidebar-scrim").hidden = !open;
}
document
  .getElementById("menu-toggle")
  .addEventListener("click", () =>
    setMenuOpen(!document.getElementById("sidebar").classList.contains("open")),
  );
document
  .getElementById("sidebar-scrim")
  .addEventListener("click", () => setMenuOpen(false));
window.matchMedia("(min-width: 851px)").addEventListener("change", (event) => {
  if (event.matches) setMenuOpen(false);
});
document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("btnExportar").addEventListener("click", () => {
  window.location.href = "/api/catalogo/exportar";
});
document.getElementById("modal-backdrop").addEventListener("click", (event) => {
  if (
    event.target.id === "modal-backdrop" ||
    event.target.closest("[data-close]")
  )
    closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
    setMenuOpen(false);
  }
});

document.getElementById("today-label").textContent = new Intl.DateTimeFormat(
  "es-PE",
  { dateStyle: "medium" },
).format(new Date());

window.addEventListener("botica:event", async (event) => {
  const type = event.detail?.evento;
  // Los eventos son avisos: el frontend vuelve a consultar la fuente de verdad mediante REST.
  if (
    [
      "stock_actualizado",
      "producto_creado",
      "producto_actualizado",
      "producto_eliminado",
      "venta_registrada",
      "venta_anulada",
    ].includes(type)
  ) {
    if (currentPage === "dashboard") await cargarDashboard();
    if (currentPage === "inventario") await cargarInventario();
    if (currentPage === "pos") {
      await cargarCatalogo();
      reconciliarCarrito();
    }
    if (
      currentPage === "ventas" &&
      ["venta_registrada", "venta_anulada"].includes(type)
    )
      await cargarVentas();
  }
});

mostrarPagina("dashboard");
