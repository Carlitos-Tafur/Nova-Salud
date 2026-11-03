const db = require('../config/database');
const asyncHandler = require('../utils/async-handler');
const httpError = require('../utils/http-error');
const emitEvent = require('../utils/emit-event');
const salesService = require('../services/sales.service');

exports.listar = asyncHandler(async (req, res) => {
  const desde = String(req.query.desde || '').trim();
  const hasta = String(req.query.hasta || '').trim();
  let sql = `
    SELECT v.id_venta, v.fecha_venta, v.total, v.metodo_pago, v.estado,
           COUNT(d.id_detalle) AS lineas,
           COALESCE(SUM(d.cantidad), 0) AS unidades
    FROM ventas v
    LEFT JOIN detalle_venta d ON d.id_venta = v.id_venta
    WHERE 1 = 1`;
  const params = [];
  if (desde) { sql += ' AND v.fecha_venta >= ?'; params.push(`${desde} 00:00:00`); }
  if (hasta) { sql += ' AND v.fecha_venta < DATE_ADD(?, INTERVAL 1 DAY)'; params.push(hasta); }
  sql += ' GROUP BY v.id_venta ORDER BY v.fecha_venta DESC LIMIT 200';
  const [rows] = await db.execute(sql, params);
  res.json(rows);
});

exports.obtener = asyncHandler(async (req, res) => {
  const [ventas] = await db.execute(
    'SELECT id_venta, fecha_venta, total, metodo_pago, estado FROM ventas WHERE id_venta = ?',
    [req.params.id]
  );
  if (!ventas.length) throw httpError(404, 'Venta no encontrada.');
  const [detalles] = await db.execute(`
    SELECT id_detalle, nombre_producto, codigo_lote,
           DATE_FORMAT(vencimiento, '%Y-%m-%d') AS vencimiento,
           cantidad, precio_unitario, subtotal
    FROM detalle_venta WHERE id_venta = ? ORDER BY id_detalle ASC
  `, [req.params.id]);
  res.json({ ...ventas[0], detalles });
});

exports.crear = asyncHandler(async (req, res) => {
  const venta = await salesService.crearVenta(req.body);
  emitEvent(req, 'venta_registrada', { id_venta: venta.id_venta });
  emitEvent(req, 'stock_actualizado', { id_venta: venta.id_venta });
  res.status(201).json({ mensaje: 'Venta registrada correctamente.', ...venta });
});

exports.anular = asyncHandler(async (req, res) => {
  const resultado = await salesService.anularVenta(req.params.id);
  emitEvent(req, 'venta_anulada', { id_venta: Number(req.params.id) });
  emitEvent(req, 'stock_actualizado', { id_venta: Number(req.params.id) });
  res.json(resultado);
});
