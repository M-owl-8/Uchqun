import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) return { socket: null, connected: false, on: () => {}, off: () => {}, emit: () => {} };
  return ctx;
}

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const eventHandlersRef = useRef(new Map());

  const getSocketUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return apiUrl.replace(/\/api\/?$/, '');
  };

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    setConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!isAuthenticated) return;
    if (socketRef.current?.connected) return;
    if (socketRef.current) socketRef.current.disconnect();

    const socket = io(getSocketUrl(), {
      // Cookie-based auth — no localStorage token needed
      // Backend reads HTTP-only accessToken cookie from handshake headers
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      withCredentials: true,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('connect_error', () => setConnected(false));
    socket.on('disconnect', (reason) => {
      setConnected(false);
      if (reason === 'io server disconnect') {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => socket.connect(), 2000);
      }
    });

    eventHandlersRef.current.forEach((handlers, event) => {
      handlers.forEach((handler) => socket.on(event, handler));
    });

    socketRef.current = socket;
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
    return disconnect;
  }, [isAuthenticated, connect, disconnect]);

  const on = useCallback((event, handler) => {
    if (!eventHandlersRef.current.has(event)) eventHandlersRef.current.set(event, new Set());
    eventHandlersRef.current.get(event).add(handler);
    if (socketRef.current) socketRef.current.on(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    const handlers = eventHandlersRef.current.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) eventHandlersRef.current.delete(event);
    }
    if (socketRef.current) socketRef.current.off(event, handler);
  }, []);

  const emit = useCallback((event, data) => {
    if (socketRef.current && connected) socketRef.current.emit(event, data);
  }, [connected]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, on, off, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export default SocketContext;
