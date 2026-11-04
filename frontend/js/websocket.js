(() => {
  let socket;
  let retry = 1000;
  let retryTimer;
  const status = () => document.getElementById("connection-status");

  function connect() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(`${protocol}//${location.host}/ws`);
    socket.addEventListener("open", () => {
      retry = 1000;
      const label = status();
      if (label) label.textContent = "Tiempo real conectado";
      document
        .querySelector(".sidebar-bottom .status-dot")
        ?.classList.add("online");
    });
    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.evento !== "conectado") {
          window.dispatchEvent(
            new CustomEvent("botica:event", { detail: message }),
          );
        }
      } catch (error) {
        console.error("Mensaje WebSocket inválido:", error);
      }
    });
    socket.addEventListener("close", () => {
      const label = status();
      if (label) label.textContent = "Tiempo real desconectado";
      document
        .querySelector(".sidebar-bottom .status-dot")
        ?.classList.remove("online");
      clearTimeout(retryTimer);
      retryTimer = setTimeout(connect, retry);
      retry = Math.min(retry * 2, 15000);
    });
    socket.addEventListener("error", () => socket.close());
  }
  connect();
})();
