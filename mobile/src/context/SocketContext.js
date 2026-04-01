import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_URL } from '../config';
import logger from '../utils/logger';

const SocketContext = createContext(null);

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    if (__DEV__) console.warn('[useSocket] Used outside SocketProvider, returning safe defaults');
    return {
      socket: null,
      connected: false,
      on: () => {},
      off: () => {},
      emit: () => {},
    };
  }
  return ctx;
}

export function SocketProvider({ children }) {
  const { accessToken, user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const eventHandlersRef = useRef(new Map());
  const userRef = useRef(user);

  // Keep userRef current without triggering reconnects
  useEffect(() => { userRef.current = user; }, [user]);

  // Get the base URL for WebSocket connection (remove /api suffix)
  const getSocketUrl = () => {
    const baseUrl = API_URL.replace(/\/api\/?$/, '');
    logger.info('[Socket] Connecting to:', baseUrl);
    return baseUrl;
  };

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (!isAuthenticated || !accessToken) {
      logger.info('[Socket] Skipping connection: not authenticated');
      return;
    }

    if (socketRef.current?.connected) {
      logger.info('[Socket] Already connected');
      return;
    }

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    if (__DEV__) {
      logger.info('[Socket] Connecting with token:', accessToken?.substring(0, 20) + '...');
    }

    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: 3,
      timeout: 10000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      logger.info('[Socket] Connected successfully', {
        socketId: newSocket.id,
        userId: userRef.current?.id,
        role: userRef.current?.role,
      });
      setConnected(true);
    });

    newSocket.on('connect_error', (error) => {
      if (__DEV__) logger.warn('[Socket] Connection failed:', error.message);
      setConnected(false);
    });

    newSocket.on('reconnect_failed', () => {
      if (__DEV__) logger.warn('[Socket] Giving up after 3 attempts — real-time disabled until next session');
    });

    newSocket.on('disconnect', (reason) => {
      logger.info('[Socket] Disconnected:', reason);
      setConnected(false);

      // Attempt to reconnect if it was an unexpected disconnect
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          logger.info('[Socket] Attempting to reconnect after server disconnect...');
          newSocket.connect();
        }, 2000);
      }
    });

    newSocket.on('error', (error) => {
      logger.error('[Socket] Error:', error);
    });

    // Clear any existing listeners before re-attaching event handlers
    eventHandlersRef.current.forEach((handlers, event) => {
      handlers.forEach(handler => {
        newSocket.off(event, handler);
      });
    });
    // Re-attach event handlers
    eventHandlersRef.current.forEach((handlers, event) => {
      handlers.forEach(handler => {
        newSocket.on(event, handler);
      });
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      newSocket.disconnect();
    };
  }, [accessToken, isAuthenticated]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      logger.info('[Socket] Disconnecting...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    }
  }, []);

  // Connect when authenticated, disconnect when not
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, accessToken, connect, disconnect]);

  // Token changes are handled by the main useEffect above via connect()
  // (removed duplicate reconnect that was creating extra socket instances)

  // Subscribe to an event
  const on = useCallback((event, handler) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event).add(handler);

    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }

    logger.debug('[Socket] Subscribed to event:', event);
  }, []);

  // Unsubscribe from an event
  const off = useCallback((event, handler) => {
    const handlers = eventHandlersRef.current.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        eventHandlersRef.current.delete(event);
      }
    }

    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }

    logger.debug('[Socket] Unsubscribed from event:', event);
  }, []);

  // Emit an event
  const emit = useCallback((event, data) => {
    if (socketRef.current && connected) {
      socketRef.current.emit(event, data);
      logger.debug('[Socket] Emitted event:', event, data);
    } else {
      logger.warn('[Socket] Cannot emit - not connected:', event);
    }
  }, [connected]);

  const value = {
    socket: socketRef.current,
    connected,
    on,
    off,
    emit,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export default SocketContext;
