let posProducts = [];
const cart = new Map();
let posSearchTimer;

async function cargarCatalogo() {
  try {
    const buscar = document.getElementById('pos-search').value.trim();
    posProducts = await api(`/catalogo${buscar ? `?buscar=${encodeURIComponent(buscar)}` : ''}`);
    renderCatalogo();
  } catch (error) { toast(error.message, 'error'); }
}

function renderCatalogo() {
  document.getElementById('pos-count').textContent = `${posProducts.length} disponibles`;
  document.getElementById('pos-products').innerHTML = posProducts.length ? posProducts.map((p) => `
    <article class="product-card"><h4>${escapeHTML(p.nombre_producto)}</h4>
      <div class="product-meta"><span>Stock: ${p.stock_disponible}</span><span>Mín.: ${p.stock_minimo}</span></div>
      <div class="product-price">${money(p.precio_venta)}</div>
      <button class="btn btn-primary" data-add-product="${p.id_producto}">＋ Añadir</button>
    </article>`).join('') : '<div class="empty-cell">No hay productos disponibles.</div>';
}

function renderCart() {
  const rows = [...cart.values()];
  const units = rows.reduce((sum, item) => sum + item.cantidad, 0);
  const totalCents = rows.reduce((sum, item) => sum + Math.round(Number(item.precio_venta) * 100) * item.cantidad, 0);
  document.getElementById('ticket-count').textContent = `${units} ${units === 1 ? 'unidad' : 'unidades'}`;
  document.getElementById('cart-total').textContent = money(totalCents / 100);
  document.getElementById('checkout-button').disabled = rows.length === 0;
  document.getElementById('cart-items').innerHTML = rows.length ? rows.map((item) => `
    <div class="cart-line"><div class="cart-line-top"><strong>${escapeHTML(item.nombre_producto)}</strong><button class="text-button" data-remove-cart="${item.id_producto}">Quitar</button></div>
      <small>${money(item.precio_venta)} · Disponible: ${item.stock_disponible}</small>
      <div class="cart-line-bottom"><div class="qty-control"><button data-qty="-1" data-id="${item.id_producto}" aria-label="Restar">−</button><span>${item.cantidad}</span><button data-qty="1" data-id="${item.id_producto}" aria-label="Sumar" ${item.cantidad >= item.stock_disponible ? 'disabled' : ''}>＋</button></div>
      <span class="line-subtotal">${money(Math.round(Number(item.precio_venta) * 100) * item.cantidad / 100)}</span></div></div>`).join('') : '<div class="cart-empty">El ticket está vacío.<br><span>Agrega productos del catálogo.</span></div>';
}

function agregarProducto(id) {
  const p = posProducts.find((item) => Number(item.id_producto) === Number(id));
  if (!p) return;
  const actual = cart.get(Number(id));
  if ((actual?.cantidad || 0) >= Number(p.stock_disponible)) return toast('No hay más stock disponible para este producto.', 'error');
  cart.set(Number(id), { ...p, cantidad: (actual?.cantidad || 0) + 1 });
  renderCart();
}

document.getElementById('pos-products').addEventListener('click', (event) => {
  const button = event.target.closest('[data-add-product]');
  if (button) agregarProducto(Number(button.dataset.addProduct));
});
document.getElementById('cart-items').addEventListener('click', (event) => {
  const remove = event.target.closest('[data-remove-cart]');
  if (remove) { cart.delete(Number(remove.dataset.removeCart)); renderCart(); return; }
  const qtyButton = event.target.closest('[data-qty]');
  if (!qtyButton) return;
  const id = Number(qtyButton.dataset.id);
  const item = cart.get(id);
  if (!item) return;
  const next = item.cantidad + Number(qtyButton.dataset.qty);
  if (next <= 0) cart.delete(id);
  else if (next <= Number(item.stock_disponible)) cart.set(id, { ...item, cantidad: next });
  else return toast('La cantidad supera el stock disponible.', 'error');
  renderCart();
});
document.getElementById('clear-cart').addEventListener('click', () => { cart.clear(); renderCart(); });
document.getElementById('pos-search').addEventListener('input', () => {
  clearTimeout(posSearchTimer); posSearchTimer = setTimeout(cargarCatalogo, 250);
});
document.getElementById('checkout-button').addEventListener('click', async () => {
  if (!cart.size) return;
  const button = document.getElementById('checkout-button');
  button.disabled = true;
  try {
    const result = await api('/ventas', {
      method: 'POST',
      body: {
        metodo_pago: document.getElementById('payment-method').value,
        items: [...cart.values()].map((item) => ({ id_producto: item.id_producto, cantidad: item.cantidad }))
      }
    });
    cart.clear(); renderCart();
    toast(`Venta #${result.id_venta} registrada · ${money(result.total)}`);
    await Promise.all([cargarCatalogo(), cargarDashboard()]);
    if (document.getElementById('page-ventas').classList.contains('active')) await cargarVentas();
  } catch (error) { toast(error.message, 'error'); await cargarCatalogo(); }
  finally { button.disabled = cart.size === 0; }
});

function reconciliarCarrito() {
  // Tras una actualización remota, el ticket conserva solo cantidades aún disponibles.
  for (const [id, item] of cart.entries()) {
    const updated = posProducts.find((p) => Number(p.id_producto) === id);
    if (!updated) cart.delete(id);
    else cart.set(id, { ...updated, cantidad: Math.min(item.cantidad, Number(updated.stock_disponible)) });
    if (cart.get(id)?.cantidad === 0) cart.delete(id);
  }
  renderCart();
}
window.cargarCatalogo = cargarCatalogo;
window.renderCart = renderCart;
window.reconciliarCarrito = reconciliarCarrito;
