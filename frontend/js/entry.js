// La API y WebSocket se sirven desde el contenedor, no desde el disco.
if (window.location.protocol === 'file:') {
  window.location.replace('http://localhost:3000/');
}
