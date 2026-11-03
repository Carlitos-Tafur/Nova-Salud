require('dotenv').config();
const http = require('http');
const WebSocket = require('ws');
const app = require('./app');
const db = require('./config/database');

const PORT = Number(process.env.PORT || 3000);
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ evento: 'conectado', datos: { mensaje: 'WebSocket conectado.' } }));
});

app.locals.emitirEvento = (evento, datos = {}) => {
  const mensaje = JSON.stringify({ evento, datos });
  for (const cliente of wss.clients) {
    if (cliente.readyState === WebSocket.OPEN) cliente.send(mensaje);
  }
};

async function iniciar() {
  try {
    await db.query('SELECT 1');
    console.log('Conexión a MySQL establecida.');
    server.listen(PORT, () => {
      console.log(`Frontend/API: http://localhost:${PORT}`);
      console.log(`WebSocket:    ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    console.error('No se pudo conectar a MySQL:', error.message);
    process.exit(1);
  }
}

iniciar();

process.on('SIGINT', async () => {
  await db.end();
  server.close(() => process.exit(0));
});
