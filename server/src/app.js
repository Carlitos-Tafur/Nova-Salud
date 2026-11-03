const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors()); // Para desarrollo local. Restringir el origen en producción.
app.use(express.json({ limit: '1mb' }));

app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/productos', require('./routes/products.routes'));
app.use('/api/catalogo', require('./routes/catalog.routes'));
app.use('/api/ventas', require('./routes/sales.routes'));

// Sirve el frontend desde el mismo servidor (evita configurar CORS en el navegador).
const frontendPath = path.resolve(__dirname, '../../frontend');
app.use(express.static(frontendPath));
app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

app.use((req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada.' });
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = error.status || (error.code === 'ER_DUP_ENTRY' ? 409 : 500);
  let mensaje = error.message || 'Error interno del servidor.';
  if (status === 500) mensaje = 'Ocurrió un error interno. Revisa la consola del servidor.';
  if (error.code === 'ER_DUP_ENTRY') mensaje = 'El registro ya existe.';
  res.status(status).json({ mensaje });
});

module.exports = app;
