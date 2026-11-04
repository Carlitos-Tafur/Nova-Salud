let inventoryCache = [];
let inventorySearchTimer;

async function cargarInventario() {
  try {
    const buscar = document.getElementById("inventory-search").value.trim();
    inventoryCache = await api(
      `/productos${buscar ? `?buscar=${encodeURIComponent(buscar)}` : ""}`,
    );
    renderInventario();
  } catch (error) {
    toast(error.message, "error");
  }
}

function renderInventario() {
  const body = document.getElementById("inventory-body");
  document.getElementById("inventory-count").textContent =
    `${inventoryCache.length} productos`;
  body.innerHTML = inventoryCache.length
    ? inventoryCache
        .map((p) => {
          const available = Number(p.stock_disponible);
          const low = available <= Number(p.stock_minimo);
          const state =
            available === 0
              ? ["Agotado", "out"]
              : low
                ? ["Stock bajo", "low"]
                : ["Disponible", "ok"];
          return `<tr>
      <td><strong>${escapeHTML(p.nombre_producto)}</strong></td><td>${money(p.precio_venta)}</td>
      <td>${p.stock_actual}</td><td>${p.stock_disponible}</td><td>${p.stock_minimo}</td>
      <td><span class="badge ${state[1]}">${state[0]}</span></td>
      <td><div class="action-group">
        <button class="action-btn" data-action="edit" data-id="${p.id_producto}">Editar</button>
        <button class="action-btn" data-action="lot" data-id="${p.id_producto}">+ Lote</button>
        <button class="action-btn danger" data-action="delete" data-id="${p.id_producto}">Eliminar</button>
      </div></td></tr>`;
        })
        .join("")
    : '<tr><td colspan="7" class="empty-cell">No se encontraron productos.</td></tr>';
}

function formularioProducto(producto = null) {
  const editar = Boolean(producto);
  showModal(
    editar ? "Editar producto" : "Nuevo producto",
    "Completa los datos generales del producto.",
    `
    <form id="product-form" class="modal-body">
      <div class="form-grid">
        <div class="form-field full"><label for="product-name">Nombre del producto</label><input id="product-name" name="nombre_producto" maxlength="150" required value="${escapeHTML(producto?.nombre_producto || "")}"></div>
        <div class="form-field"><label for="product-price">Precio de venta (S/)</label><input id="product-price" name="precio_venta" type="number" min="0" step="0.01" required value="${producto ? Number(producto.precio_venta).toFixed(2) : ""}"></div>
        <div class="form-field"><label for="product-min">Stock mínimo</label><input id="product-min" name="stock_minimo" type="number" min="0" step="1" required value="${producto?.stock_minimo ?? 5}"></div>
      </div>
      <div class="modal-actions"><button type="button" class="btn btn-light" data-close>Cancelar</button><button class="btn btn-primary" type="submit">${editar ? "Guardar cambios" : "Crear producto"}</button></div>
    </form>`,
    false,
  );
  document
    .getElementById("product-form")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const body = Object.fromEntries(form.entries());
      body.stock_minimo = Number(body.stock_minimo);
      body.precio_venta = Number(body.precio_venta);
      try {
        await api(
          editar ? `/productos/${producto.id_producto}` : "/productos",
          { method: editar ? "PUT" : "POST", body },
        );
        closeModal();
        toast(editar ? "Producto actualizado." : "Producto creado.");
        await cargarInventario();
      } catch (error) {
        toast(error.message, "error");
      }
    });
}

async function abrirLotes(id) {
  try {
    const [producto, lotes] = await Promise.all([
      api(`/productos/${id}`),
      api(`/productos/${id}/lotes`),
    ]);
    const rows = lotes.length
      ? lotes
          .map(
            (l) =>
              `<tr><td>${escapeHTML(l.codigo_lote)}</td><td>${formatDate(l.vencimiento)}</td><td>${l.stock}</td><td><span class="badge ${l.disponible_venta ? "ok" : "out"}">${l.disponible_venta ? "Disponible" : "No vendible"}</span></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="4" class="empty-cell">Este producto aún no tiene lotes.</td></tr>';
    showModal(
      `Lotes: ${producto.nombre_producto}`,
      "Stock separado por lote y fecha de vencimiento.",
      `
      <div class="modal-body"><div class="table-wrap"><table><thead><tr><th>Código</th><th>Vencimiento</th><th>Stock</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="modal-actions"><button class="btn btn-light" data-close>Cerrar</button><button class="btn btn-primary" id="add-lot-from-list">＋ Registrar lote</button></div></div>`,
      true,
    );
    document
      .getElementById("add-lot-from-list")
      .addEventListener("click", () =>
        formularioLote(id, producto.nombre_producto),
      );
  } catch (error) {
    toast(error.message, "error");
  }
}

function formularioLote(id, nombre) {
  showModal(
    "Registrar lote",
    `Producto: ${nombre}`,
    `
    <form id="lot-form" class="modal-body"><div class="form-grid">
      <div class="form-field full"><label for="lot-code">Código de lote</label><input id="lot-code" name="codigo_lote" maxlength="50" required></div>
      <div class="form-field"><label for="lot-expiry">Fecha de vencimiento</label><input id="lot-expiry" name="vencimiento" type="date" required></div>
      <div class="form-field"><label for="lot-stock">Stock inicial</label><input id="lot-stock" name="stock" type="number" min="0" step="1" value="0" required></div>
    </div><div class="modal-actions"><button type="button" class="btn btn-light" data-close>Cancelar</button><button class="btn btn-primary" type="submit">Guardar lote</button></div></form>`,
  );
  document
    .getElementById("lot-form")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(
        new FormData(event.currentTarget).entries(),
      );
      body.stock = Number(body.stock);
      try {
        await api(`/productos/${id}/lotes`, { method: "POST", body });
        closeModal();
        toast("Lote registrado.");
        await cargarInventario();
      } catch (error) {
        toast(error.message, "error");
      }
    });
}

async function eliminarProducto(id) {
  const producto = inventoryCache.find(
    (p) => Number(p.id_producto) === Number(id),
  );
  if (
    !producto ||
    !confirm(
      `¿Eliminar lógicamente "${producto.nombre_producto}"? No se borrarán sus registros históricos.`,
    )
  )
    return;
  try {
    await api(`/productos/${id}`, { method: "DELETE" });
    toast("Producto eliminado lógicamente.");
    await cargarInventario();
  } catch (error) {
    toast(error.message, "error");
  }
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === "edit") {
    try {
      formularioProducto(await api(`/productos/${id}`));
    } catch (error) {
      toast(error.message, "error");
    }
  }
  if (button.dataset.action === "lot") {
    const p = inventoryCache.find((x) => Number(x.id_producto) === id);
    formularioLote(id, p?.nombre_producto || "");
  }
  if (button.dataset.action === "delete") eliminarProducto(id);
});

document
  .getElementById("new-product")
  .addEventListener("click", () => formularioProducto());
document.getElementById("inventory-search").addEventListener("input", () => {
  clearTimeout(inventorySearchTimer);
  inventorySearchTimer = setTimeout(cargarInventario, 250);
});
window.cargarInventario = cargarInventario;
