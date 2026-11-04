const db = require("../config/database");
const httpError = require("../utils/http-error");

const METODOS = new Set([
  "EFECTIVO",
  "YAPE",
  "PLIN",
  "TARJETA",
  "TRANSFERENCIA",
]);
const toCents = (value) => Math.round(Number(value) * 100);
const fromCents = (value) => (value / 100).toFixed(2);

async function crearVenta({ items, metodo_pago }) {
  if (!Array.isArray(items) || items.length === 0)
    throw httpError(400, "Agrega al menos un producto al ticket.");
  if (!METODOS.has(metodo_pago))
    throw httpError(400, "Método de pago no válido.");

  // Combina líneas repetidas y valida cantidades antes de abrir la transacción.
  const cantidades = new Map();
  for (const item of items) {
    const id = Number(item.id_producto);
    const cantidad = Number(item.cantidad);
    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      !Number.isInteger(cantidad) ||
      cantidad <= 0
    ) {
      throw httpError(
        400,
        "Cada producto debe tener un ID y una cantidad entera positiva.",
      );
    }
    cantidades.set(id, (cantidades.get(id) || 0) + cantidad);
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const asignaciones = [];
    let totalCentimos = 0;

    for (const [idProducto, cantidadSolicitada] of [
      ...cantidades.entries(),
    ].sort((a, b) => a[0] - b[0])) {
      const [productos] = await connection.execute(
        `SELECT id_producto, nombre_producto, precio_venta
         FROM productos WHERE id_producto = ? AND activo = 1 FOR UPDATE`,
        [idProducto],
      );
      if (!productos.length)
        throw httpError(
          409,
          `El producto ${idProducto} ya no está disponible.`,
        );
      const producto = productos[0];

      // FEFO: se bloquean lotes vigentes y con stock, empezando por el vencimiento más cercano.
      const [lotes] = await connection.execute(
        `SELECT id_lote, codigo_lote, vencimiento, stock
         FROM lotes
         WHERE id_producto = ? AND stock > 0 AND vencimiento >= CURDATE()
         ORDER BY vencimiento ASC, id_lote ASC
         FOR UPDATE`,
        [idProducto],
      );

      const stockDisponible = lotes.reduce(
        (sum, lote) => sum + Number(lote.stock),
        0,
      );
      if (stockDisponible < cantidadSolicitada) {
        throw httpError(
          409,
          `Stock insuficiente para ${producto.nombre_producto}. Disponible: ${stockDisponible}.`,
        );
      }

      let pendiente = cantidadSolicitada;
      const precioCentimos = toCents(producto.precio_venta);
      for (const lote of lotes) {
        if (pendiente === 0) break;
        const tomar = Math.min(pendiente, Number(lote.stock));
        const subtotalCentimos = tomar * precioCentimos;
        asignaciones.push({
          id_producto: idProducto,
          id_lote: lote.id_lote,
          nombre_producto: producto.nombre_producto,
          codigo_lote: lote.codigo_lote,
          vencimiento: lote.vencimiento,
          cantidad: tomar,
          precio_unitario: fromCents(precioCentimos),
          subtotal: fromCents(subtotalCentimos),
          subtotal_centimos: subtotalCentimos,
        });
        totalCentimos += subtotalCentimos;
        pendiente -= tomar;
      }
    }

    const [ventaResult] = await connection.execute(
      "INSERT INTO ventas (total, metodo_pago) VALUES (?, ?)",
      [fromCents(totalCentimos), metodo_pago],
    );
    const idVenta = ventaResult.insertId;

    for (const linea of asignaciones) {
      await connection.execute(
        "UPDATE lotes SET stock = stock - ? WHERE id_lote = ? AND stock >= ?",
        [linea.cantidad, linea.id_lote, linea.cantidad],
      );
      await connection.execute(
        `INSERT INTO detalle_venta
          (id_venta, id_producto, id_lote, nombre_producto, codigo_lote,
           vencimiento, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idVenta,
          linea.id_producto,
          linea.id_lote,
          linea.nombre_producto,
          linea.codigo_lote,
          linea.vencimiento,
          linea.cantidad,
          linea.precio_unitario,
          linea.subtotal,
        ],
      );
      await connection.execute(
        `INSERT INTO movimientos_stock (id_lote, tipo, cantidad, motivo, referencia_id)
         VALUES (?, 'VENTA', ?, 'Salida por venta', ?)`,
        [linea.id_lote, linea.cantidad, idVenta],
      );
    }

    await connection.commit();
    return {
      id_venta: idVenta,
      total: fromCents(totalCentimos),
      metodo_pago,
      lineas: asignaciones,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function anularVenta(idVenta) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [ventas] = await connection.execute(
      "SELECT id_venta, estado FROM ventas WHERE id_venta = ? FOR UPDATE",
      [idVenta],
    );
    if (!ventas.length) throw httpError(404, "Venta no encontrada.");
    if (ventas[0].estado === "ANULADA")
      throw httpError(409, "La venta ya está anulada.");

    const [detalles] = await connection.execute(
      "SELECT id_lote, cantidad FROM detalle_venta WHERE id_venta = ? FOR UPDATE",
      [idVenta],
    );
    for (const detalle of detalles) {
      await connection.execute(
        "UPDATE lotes SET stock = stock + ? WHERE id_lote = ?",
        [detalle.cantidad, detalle.id_lote],
      );
      await connection.execute(
        `INSERT INTO movimientos_stock (id_lote, tipo, cantidad, motivo, referencia_id)
         VALUES (?, 'ANULACION_VENTA', ?, 'Devolución por anulación de venta', ?)`,
        [detalle.id_lote, detalle.cantidad, idVenta],
      );
    }
    await connection.execute(
      "UPDATE ventas SET estado = 'ANULADA' WHERE id_venta = ?",
      [idVenta],
    );
    await connection.commit();
    return {
      id_venta: Number(idVenta),
      mensaje: "Venta anulada y stock restaurado.",
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { crearVenta, anularVenta };
