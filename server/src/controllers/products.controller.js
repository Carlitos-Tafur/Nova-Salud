const db = require("../config/database");
const asyncHandler = require("../utils/async-handler");
const httpError = require("../utils/http-error");
const emitEvent = require("../utils/emit-event");

exports.listar = asyncHandler(async (req, res) => {
  const buscar = String(req.query.buscar || "").trim();
  let sql = `SELECT id_producto, nombre_producto, stock_minimo, precio_venta,
                    stock_actual, stock_disponible
             FROM catalogo WHERE activo = 1`;
  const params = [];
  if (buscar) {
    sql += " AND nombre_producto LIKE ?";
    params.push(`%${buscar}%`);
  }
  sql += " ORDER BY nombre_producto ASC";
  const [rows] = await db.execute(sql, params);
  res.json(rows);
});

exports.obtener = asyncHandler(async (req, res) => {
  const [rows] = await db.execute(
    "SELECT * FROM catalogo WHERE id_producto = ? AND activo = 1",
    [req.params.id],
  );
  if (!rows.length) throw httpError(404, "Producto no encontrado.");
  res.json(rows[0]);
});

exports.crear = asyncHandler(async (req, res) => {
  const nombre = String(req.body.nombre_producto || "").trim();
  const stockMinimo = Number(req.body.stock_minimo ?? 5);
  const precio = Number(req.body.precio_venta);
  if (!nombre || nombre.length > 150)
    throw httpError(
      400,
      "El nombre es obligatorio y debe tener máximo 150 caracteres.",
    );
  if (!Number.isInteger(stockMinimo) || stockMinimo < 0)
    throw httpError(
      400,
      "El stock mínimo debe ser un entero igual o mayor que cero.",
    );
  if (!Number.isFinite(precio) || precio < 0 || precio > 99999999.99)
    throw httpError(400, "El precio de venta no es válido.");

  const [result] = await db.execute(
    "INSERT INTO productos (nombre_producto, stock_minimo, precio_venta) VALUES (?, ?, ?)",
    [nombre, stockMinimo, precio.toFixed(2)],
  );
  emitEvent(req, "producto_creado", { id_producto: result.insertId });
  res
    .status(201)
    .json({ id_producto: result.insertId, mensaje: "Producto creado." });
});

exports.actualizar = asyncHandler(async (req, res) => {
  const nombre = String(req.body.nombre_producto || "").trim();
  const stockMinimo = Number(req.body.stock_minimo);
  const precio = Number(req.body.precio_venta);
  if (!nombre || nombre.length > 150)
    throw httpError(
      400,
      "El nombre es obligatorio y debe tener máximo 150 caracteres.",
    );
  if (!Number.isInteger(stockMinimo) || stockMinimo < 0)
    throw httpError(
      400,
      "El stock mínimo debe ser un entero igual o mayor que cero.",
    );
  if (!Number.isFinite(precio) || precio < 0 || precio > 99999999.99)
    throw httpError(400, "El precio de venta no es válido.");

  const [existentes] = await db.execute(
    "SELECT id_producto FROM productos WHERE id_producto = ? AND activo = 1",
    [req.params.id],
  );
  if (!existentes.length)
    throw httpError(404, "Producto no encontrado o inactivo.");
  await db.execute(
    `UPDATE productos SET nombre_producto = ?, stock_minimo = ?, precio_venta = ?
     WHERE id_producto = ? AND activo = 1`,
    [nombre, stockMinimo, precio.toFixed(2), req.params.id],
  );
  emitEvent(req, "producto_actualizado", {
    id_producto: Number(req.params.id),
  });
  res.json({ mensaje: "Producto actualizado." });
});

exports.eliminar = asyncHandler(async (req, res) => {
  const [result] = await db.execute(
    "UPDATE productos SET activo = 0 WHERE id_producto = ? AND activo = 1",
    [req.params.id],
  );
  if (!result.affectedRows)
    throw httpError(404, "Producto no encontrado o ya eliminado.");
  emitEvent(req, "producto_eliminado", { id_producto: Number(req.params.id) });
  res.json({ mensaje: "Producto eliminado lógicamente." });
});

exports.listarLotes = asyncHandler(async (req, res) => {
  const [producto] = await db.execute(
    "SELECT id_producto FROM productos WHERE id_producto = ? AND activo = 1",
    [req.params.id],
  );
  if (!producto.length) throw httpError(404, "Producto no encontrado.");
  const [rows] = await db.execute(
    `
    SELECT id_lote, codigo_lote, DATE_FORMAT(vencimiento, '%Y-%m-%d') AS vencimiento,
           stock, (vencimiento >= CURDATE() AND stock > 0) AS disponible_venta
    FROM lotes WHERE id_producto = ? ORDER BY vencimiento ASC
  `,
    [req.params.id],
  );
  res.json(rows);
});

exports.crearLote = asyncHandler(async (req, res) => {
  const idProducto = Number(req.params.id);
  const codigo = String(req.body.codigo_lote || "").trim();
  const vencimiento = String(req.body.vencimiento || "");
  const stock = Number(req.body.stock);
  if (!codigo || codigo.length > 50)
    throw httpError(
      400,
      "El código de lote es obligatorio (máximo 50 caracteres).",
    );
  const fecha = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(vencimiento);
  const fechaValida =
    fecha &&
    (() => {
      const date = new Date(
        Date.UTC(Number(fecha[1]), Number(fecha[2]) - 1, Number(fecha[3])),
      );
      return (
        date.getUTCFullYear() === Number(fecha[1]) &&
        date.getUTCMonth() === Number(fecha[2]) - 1 &&
        date.getUTCDate() === Number(fecha[3])
      );
    })();
  if (!fechaValida)
    throw httpError(
      400,
      "La fecha de vencimiento debe ser una fecha válida con formato AAAA-MM-DD.",
    );
  if (!Number.isInteger(stock) || stock < 0)
    throw httpError(400, "El stock debe ser un entero igual o mayor que cero.");

  const connection = await db.getConnection();
  let idLote;
  try {
    await connection.beginTransaction();
    const [productos] = await connection.execute(
      "SELECT id_producto FROM productos WHERE id_producto = ? AND activo = 1 FOR UPDATE",
      [idProducto],
    );
    if (!productos.length)
      throw httpError(404, "Producto no encontrado o inactivo.");
    const [result] = await connection.execute(
      "INSERT INTO lotes (id_producto, codigo_lote, vencimiento, stock) VALUES (?, ?, ?, ?)",
      [idProducto, codigo, vencimiento, stock],
    );
    idLote = result.insertId;
    if (stock > 0) {
      await connection.execute(
        `INSERT INTO movimientos_stock (id_lote, tipo, cantidad, motivo)
         VALUES (?, 'ENTRADA', ?, 'Registro inicial del lote')`,
        [idLote, stock],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY")
      throw httpError(409, "Ya existe ese código de lote para este producto.");
    throw error;
  } finally {
    connection.release();
  }
  emitEvent(req, "stock_actualizado", { id_producto: idProducto });
  res.status(201).json({ id_lote: idLote, mensaje: "Lote registrado." });
});
