async function cargarVentas() {
  try {
    const desde = document.getElementById("sales-from").value;
    const hasta = document.getElementById("sales-to").value;
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    const ventas = await api(`/ventas${params.toString() ? `?${params}` : ""}`);
    document.getElementById("sales-count").textContent =
      `${ventas.length} ventas`;
    document.getElementById("sales-body").innerHTML = ventas.length
      ? ventas
          .map(
            (v) => `
      <tr><td><strong>#${v.id_venta}</strong></td><td>${formatDate(String(v.fecha_venta).slice(0, 10))} ${String(v.fecha_venta).slice(11, 16)}</td>
      <td>${v.unidades}</td><td><strong>${money(v.total)}</strong></td><td>${escapeHTML(v.metodo_pago)}</td>
      <td><span class="badge ${v.estado === "COMPLETADA" ? "ok" : "cancelled"}">${v.estado === "COMPLETADA" ? "Completada" : "Anulada"}</span></td>
      <td><button class="action-btn" data-sale-detail="${v.id_venta}">Ver detalle</button></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="7" class="empty-cell">No hay ventas para el filtro seleccionado.</td></tr>';
  } catch (error) {
    toast(error.message, "error");
  }
}

async function verDetalleVenta(id) {
  try {
    const venta = await api(`/ventas/${id}`);
    const rows = venta.detalles
      .map(
        (d) =>
          `<tr><td><strong>${escapeHTML(d.nombre_producto)}</strong><br><span class="muted">Lote ${escapeHTML(d.codigo_lote)} · Vence ${formatDate(d.vencimiento)}</span></td><td>${d.cantidad}</td><td>${money(d.precio_unitario)}</td><td>${money(d.subtotal)}</td></tr>`,
      )
      .join("");
    const anular =
      venta.estado === "COMPLETADA"
        ? `<button class="btn btn-light" id="cancel-sale">Anular venta</button>`
        : "";
    showModal(
      `Venta #${venta.id_venta}`,
      `${formatDate(String(venta.fecha_venta).slice(0, 10))} · ${String(venta.fecha_venta).slice(11, 16)} · ${venta.metodo_pago} · ${venta.estado}`,
      `
      <div class="modal-body"><div class="table-wrap"><table><thead><tr><th>Producto / lote</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="detail-total"><span>Total de la venta</span><strong>${money(venta.total)}</strong></div>
      <div class="modal-actions"><button class="btn btn-light" data-close>Cerrar</button>${anular}</div></div>`,
      true,
    );
    document
      .getElementById("cancel-sale")
      ?.addEventListener("click", async () => {
        if (
          !confirm(
            `¿Anular la venta #${id}? Se restaurará el stock de sus lotes.`,
          )
        )
          return;
        try {
          await api(`/ventas/${id}/anular`, { method: "PATCH" });
          closeModal();
          toast("Venta anulada y stock restaurado.");
          await cargarVentas();
          await cargarDashboard();
        } catch (error) {
          toast(error.message, "error");
        }
      });
  } catch (error) {
    toast(error.message, "error");
  }
}

document.getElementById("sales-body").addEventListener("click", (event) => {
  const button = event.target.closest("[data-sale-detail]");
  if (button) verDetalleVenta(button.dataset.saleDetail);
});
document.getElementById("filter-sales").addEventListener("click", cargarVentas);
document.getElementById("clear-sales-filter").addEventListener("click", () => {
  document.getElementById("sales-from").value = "";
  document.getElementById("sales-to").value = "";
  cargarVentas();
});
window.cargarVentas = cargarVentas;
