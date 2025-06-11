import { useEffect, useState } from 'react';

const getSocketUrl = () => {
  const h = location;
  const host = h.host;
  const isHttps = h.protocol === 'https:';
  return `${isHttps ? 'wss' : 'ws'}://${host}/ws-chat`;
};

export function useSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(getSocketUrl(), 'chat');

    socket.addEventListener('message', (event) => {
      console.log('ws message', event);
    });

    socket.addEventListener('open', () => {
      console.log('ws open');
    });

    socket.addEventListener('close', () => {
      console.log('ws close');
    });

    socket.addEventListener('error', (event) => {
      console.log('ws error', event);
    });

    setSocket(socket);

    return () => {
      socket.close();
    };
  }, []);

  return {
    socket,
  };
}
