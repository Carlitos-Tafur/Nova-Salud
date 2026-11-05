const db = require("../config/database");
const asyncHandler = require("../utils/async-handler");
const XLSX = require("xlsx");

exports.listar = asyncHandler(async (req, res) => {
  const buscar = String(req.query.buscar || "").trim();
  let sql = `SELECT id_producto, nombre_producto, precio_venta, stock_minimo,
                    stock_actual, stock_disponible
             FROM catalogo
             WHERE activo = 1 AND stock_disponible > 0`;
  const params = [];
  if (buscar) {
    sql += " AND nombre_producto LIKE ?";
    params.push(`%${buscar}%`);
  }
  sql += " ORDER BY nombre_producto ASC";
  const [rows] = await db.execute(sql, params);
  res.json(rows);
});

exports.exportarExcel = asyncHandler(async (req, res) => {
  const buscar = String(req.query.buscar || "").trim();
  let sql = `SELECT id_producto, nombre_producto, precio_venta, stock_minimo,
                    stock_actual, stock_disponible
             FROM catalogo
             WHERE activo = 1 AND stock_disponible > 0`;
  const params = [];

  if (buscar) {
    sql += " AND nombre_producto LIKE ?";
    params.push(`%${buscar}%`);
  }

  sql += " ORDER BY nombre_producto ASC";

  // 1. Consultar los datos de la base de datos
  const [rows] = await db.execute(sql, params);

  // 2. Dar formato amigable a las columnas para el Excel
  const datosFormateados = rows.map((item) => ({
    ID: item.id_producto,
    Producto: item.nombre_producto,
    "Precio de Venta": item.precio_venta,
    "Stock Mínimo": item.stock_minimo,
    "Stock Actual": item.stock_actual,
    "Stock Disponible": item.stock_disponible,
  }));

  // 3. Crear el libro de trabajo (Workbook) y la hoja (Worksheet)
  const worksheet = XLSX.utils.json_to_sheet(datosFormateados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Catálogo");

  // 4. Generar el archivo en formato Buffer (memoria)
  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });

  // 5. Configurar los headers HTTP para que el navegador entienda que es un archivo descargable
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="catalogo_productos.xlsx"',
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );

  // 6. Enviar el archivo binario como respuesta
  res.send(excelBuffer);
});
