const db = require('../config/database');
const asyncHandler = require('../utils/async-handler');

exports.resumen = asyncHandler(async (req, res) => {
  const [[row]] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM productos WHERE activo = 1) AS productos,
      (SELECT COUNT(*) FROM catalogo WHERE activo = 1 AND stock_disponible > 0 AND stock_disponible <= stock_minimo) AS stock_bajo,
      (SELECT COUNT(*) FROM catalogo WHERE activo = 1 AND stock_disponible = 0) AS agotados,
      (SELECT COUNT(*) FROM lotes l JOIN productos p ON p.id_producto = l.id_producto
        WHERE p.activo = 1 AND l.stock > 0
          AND l.vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)) AS lotes_por_vencer,
      (SELECT COALESCE(SUM(total), 0) FROM ventas
        WHERE estado = 'COMPLETADA' AND DATE(fecha_venta) = CURDATE()) AS ventas_hoy
  `);
  res.json(row);
});

exports.stockBajo = asyncHandler(async (req, res) => {
  const [rows] = await db.query(`
    SELECT id_producto, nombre_producto, stock_minimo, stock_actual, stock_disponible
    FROM catalogo
    WHERE activo = 1 AND stock_disponible > 0 AND stock_disponible <= stock_minimo
    ORDER BY stock_disponible ASC, nombre_producto ASC
  `);
  res.json(rows);
});

exports.proximosVencer = asyncHandler(async (req, res) => {
  const dias = Math.min(Math.max(Number.parseInt(req.query.dias, 10) || 90, 1), 365);
  const [rows] = await db.execute(`
    SELECT l.id_lote, l.id_producto, p.nombre_producto, l.codigo_lote,
           DATE_FORMAT(l.vencimiento, '%Y-%m-%d') AS vencimiento,
           l.stock,
           DATEDIFF(l.vencimiento, CURDATE()) AS dias_restantes
    FROM lotes l
    JOIN productos p ON p.id_producto = l.id_producto
    WHERE p.activo = 1 AND l.stock > 0
      AND l.vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
    ORDER BY l.vencimiento ASC
  `, [dias]);
  res.json(rows);
});
