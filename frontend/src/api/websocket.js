const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL + '/ws';
  if (import.meta.env.DEV) return 'ws://localhost:8000/ws';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
};

const WS_URL = getWsUrl();

let socket = null;
let pingInterval = null;
const listeners = new Map();

export function connectWebSocket(onEvent) {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log('[WS] Connected');
    // Keep alive ping every 25s
    pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) socket.send('ping');
    }, 25000);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.event === 'pong') return;
      onEvent(data);
    } catch (e) {
      // ignore parse errors
    }
  };

  socket.onclose = () => {
    console.log('[WS] Disconnected — reconnecting in 3s...');
    clearInterval(pingInterval);
    setTimeout(() => connectWebSocket(onEvent), 3000);
  };

  socket.onerror = () => {
    socket.close();
  };
}

export function disconnectWebSocket() {
  clearInterval(pingInterval);
  if (socket) {
    socket.onclose = null; // prevent reconnect on manual disconnect
    socket.close();
    socket = null;
  }
}
