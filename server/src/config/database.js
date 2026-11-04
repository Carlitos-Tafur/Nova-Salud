const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "botica_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: false,
  dateStrings: true,
});

// Las funciones CURDATE(), NOW() y CURRENT_TIMESTAMP trabajan en hora de Perú.
pool.on("connection", (connection) => {
  connection.query("SET time_zone = '-05:00'");
});

module.exports = pool;
