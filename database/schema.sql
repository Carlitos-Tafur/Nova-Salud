-- Base de datos independiente para el mini-proyecto de botica.
-- Compatible con MySQL 8.0+. Se puede ejecutar en MySQL Workbench.


CREATE DATABASE IF NOT EXISTS botica_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;


USE botica_db;


CREATE TABLE IF NOT EXISTS productos (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nombre_producto VARCHAR(150) NOT NULL,
    stock_minimo INT NOT NULL DEFAULT 5,
    precio_venta DECIMAL(10,2) NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT chk_productos_stock_minimo CHECK (stock_minimo >= 0),
    CONSTRAINT chk_productos_precio CHECK (precio_venta >= 0),
    INDEX idx_productos_nombre (nombre_producto),
    INDEX idx_productos_activo (activo)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS lotes (
    id_lote INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    codigo_lote VARCHAR(50) NOT NULL,
    vencimiento DATE NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_lotes_producto FOREIGN KEY (id_producto)
      REFERENCES productos(id_producto) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_lotes_stock CHECK (stock >= 0),
    CONSTRAINT uq_lote_producto_codigo UNIQUE (id_producto, codigo_lote),
    INDEX idx_lotes_vencimiento (vencimiento),
    INDEX idx_lotes_producto_stock (id_producto, stock)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS ventas (
    id_venta INT AUTO_INCREMENT PRIMARY KEY,
    fecha_venta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10,2) NOT NULL,
    metodo_pago ENUM('EFECTIVO','YAPE','PLIN','TARJETA','TRANSFERENCIA') NOT NULL,
    estado ENUM('COMPLETADA','ANULADA') NOT NULL DEFAULT 'COMPLETADA',
    CONSTRAINT chk_ventas_total CHECK (total >= 0),
    INDEX idx_ventas_fecha (fecha_venta),
    INDEX idx_ventas_estado (estado)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS detalle_venta (
    id_detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_venta INT NOT NULL,
    id_producto INT NOT NULL,
    id_lote INT NOT NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    codigo_lote VARCHAR(50) NOT NULL,
    vencimiento DATE NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta)
      REFERENCES ventas(id_venta) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto)
      REFERENCES productos(id_producto) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_lote FOREIGN KEY (id_lote)
      REFERENCES lotes(id_lote) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detalle_precio CHECK (precio_unitario >= 0),
    CONSTRAINT chk_detalle_subtotal CHECK (subtotal >= 0),
    INDEX idx_detalle_venta (id_venta)
) ENGINE=InnoDB;


-- Historial informativo. La cantidad siempre se registra en positivo;
-- el tipo indica si fue entrada o salida.
CREATE TABLE IF NOT EXISTS movimientos_stock (
    id_movimiento INT AUTO_INCREMENT PRIMARY KEY,
    id_lote INT NOT NULL,
    tipo ENUM('ENTRADA','VENTA','AJUSTE_ENTRADA','AJUSTE_SALIDA','MERMA','ANULACION_VENTA') NOT NULL,
    cantidad INT NOT NULL,
    motivo VARCHAR(255) NULL,
    referencia_id INT NULL,
    fecha_movimiento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movimiento_lote FOREIGN KEY (id_lote)
      REFERENCES lotes(id_lote) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_movimiento_cantidad CHECK (cantidad > 0),
    INDEX idx_movimientos_fecha (fecha_movimiento),
    INDEX idx_movimientos_lote (id_lote)
) ENGINE=InnoDB;


-- Vista resumen: una fila por producto. El stock_actual incluye todos los
-- lotes; stock_disponible excluye lotes vencidos para evitar venderlos.
CREATE OR REPLACE VIEW catalogo AS
SELECT
    p.id_producto,
    p.nombre_producto,
    p.stock_minimo,
    p.precio_venta,
    p.activo,
    COALESCE(SUM(l.stock), 0) AS stock_actual,
    COALESCE(SUM(CASE
        WHEN l.vencimiento >= CURDATE() THEN l.stock
        ELSE 0
    END), 0) AS stock_disponible
FROM productos p
LEFT JOIN lotes l ON l.id_producto = p.id_producto
GROUP BY
    p.id_producto,
    p.nombre_producto,
    p.stock_minimo,
    p.precio_venta,
    p.activo;


-- Datos de prueba opcionales. Descomenta si deseas probar rápidamente.
-- INSERT INTO productos (nombre_producto, stock_minimo, precio_venta)
-- VALUES ('Paracetamol 500 mg', 20, 0.50), ('Ibuprofeno 400 mg', 10, 1.00);
-- INSERT INTO lotes (id_producto, codigo_lote, vencimiento, stock)
-- VALUES (1, 'PAR-2027-01', '2027-01-31', 100), (2, 'IBU-2027-03', '2027-03-31', 40);
