async function cargarDashboard() {
  try {
    const [resumen, bajo, vencer] = await Promise.all([
      api('/dashboard/resumen'), api('/dashboard/stock-bajo'), api('/dashboard/proximos-vencer?dias=90')
    ]);
    document.getElementById('stat-productos').textContent = resumen.productos;
    document.getElementById('stat-bajo').textContent = resumen.stock_bajo;
    document.getElementById('stat-agotados').textContent = resumen.agotados;
    document.getElementById('stat-vencer').textContent = resumen.lotes_por_vencer;
    document.getElementById('stat-ventas').textContent = money(resumen.ventas_hoy);
    document.getElementById('low-stock-body').innerHTML = bajo.length ? bajo.map((p) => `
      <tr><td><strong>${escapeHTML(p.nombre_producto)}</strong></td><td>${p.stock_disponible}</td><td>${p.stock_minimo}</td>
      <td><span class="badge ${Number(p.stock_disponible) === 0 ? 'out' : 'low'}">${Number(p.stock_disponible) === 0 ? 'Agotado' : 'Stock bajo'}</span></td></tr>`).join('') : '<tr><td colspan="4" class="empty-cell">No hay alertas de stock bajo.</td></tr>';
    document.getElementById('expiring-body').innerHTML = vencer.length ? vencer.map((l) => `
      <tr><td><strong>${escapeHTML(l.nombre_producto)}</strong><br><span class="muted">${escapeHTML(l.codigo_lote)}</span></td>
      <td>${formatDate(l.vencimiento)}</td><td>${l.stock}</td><td><span class="badge ${Number(l.dias_restantes) <= 30 ? 'low' : 'info'}">${l.dias_restantes} días</span></td></tr>`).join('') : '<tr><td colspan="4" class="empty-cell">No hay lotes próximos a vencer.</td></tr>';
  } catch (error) { toast(error.message, 'error'); }
}
window.cargarDashboard = cargarDashboard;
