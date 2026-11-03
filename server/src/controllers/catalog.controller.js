const db = require('../config/database');
const asyncHandler = require('../utils/async-handler');

exports.listar = asyncHandler(async (req, res) => {
  const buscar = String(req.query.buscar || '').trim();
  let sql = `SELECT id_producto, nombre_producto, precio_venta, stock_minimo,
                    stock_actual, stock_disponible
             FROM catalogo
             WHERE activo = 1 AND stock_disponible > 0`;
  const params = [];
  if (buscar) {
    sql += ' AND nombre_producto LIKE ?';
    params.push(`%${buscar}%`);
  }
  sql += ' ORDER BY nombre_producto ASC';
  const [rows] = await db.execute(sql, params);
  res.json(rows);
});
