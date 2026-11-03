module.exports = function emitEvent(req, evento, datos = {}) {
  const emitir = req.app.locals.emitirEvento;
  if (typeof emitir === 'function') emitir(evento, datos);
};
