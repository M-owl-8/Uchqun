import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    console.warn('[useSocket] Used outside SocketProvider, returning safe defaults');
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
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const eventHandlersRef = useRef(new Map());

  // Get the base URL for WebSocket connection
  const getSocketUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://uchqun-production-2d8a.up.railway.app/api';
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    console.log('[Socket] Connecting to:', baseUrl);
    return baseUrl;
  };

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (!isAuthenticated || !accessToken) {
      console.log('[Socket] Skipping connection: not authenticated');
      return;
    }

    if (socketRef.current?.connected) {
      console.log('[Socket] Already connected');
      return;
    }

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    console.log('[Socket] Connecting with token:', accessToken?.substring(0, 20) + '...');

    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      withCredentials: true, // For cookie-based auth as fallback
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('[Socket] Connected successfully', {
        socketId: newSocket.id,
        userId: user?.id,
        role: user?.role,
      });
      setConnected(true);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', {
        message: error.message,
        description: error.description,
        context: error.context,
      });
      setConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setConnected(false);

      // Attempt to reconnect if it was an unexpected disconnect
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[Socket] Attempting to reconnect after server disconnect...');
          newSocket.connect();
        }, 2000);
      }
    });

    newSocket.on('error', (error) => {
      console.error('[Socket] Error:', error);
    });

    // Re-attach event handlers
    eventHandlersRef.current.forEach((handlers, event) => {
      handlers.forEach(handler => {
        newSocket.on(event, handler);
      });
    });

    socketRef.current = newSocket;

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      newSocket.disconnect();
    };
  }, [accessToken, isAuthenticated, user]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('[Socket] Disconnecting...');
      socketRef.current.disconnect();
      socketRef.current = null;
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

  // Reconnect when token changes
  useEffect(() => {
    if (socketRef.current && isAuthenticated && accessToken) {
      console.log('[Socket] Token changed, reconnecting...');
      disconnect();
      setTimeout(() => connect(), 500);
    }
  }, [accessToken, connect, disconnect, isAuthenticated]);

  // Subscribe to an event
  const on = useCallback((event, handler) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event).add(handler);

    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }

    console.debug('[Socket] Subscribed to event:', event);
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

    console.debug('[Socket] Unsubscribed from event:', event);
  }, []);

  // Emit an event
  const emit = useCallback((event, data) => {
    if (socketRef.current && connected) {
      socketRef.current.emit(event, data);
      console.debug('[Socket] Emitted event:', event, data);
    } else {
      console.warn('[Socket] Cannot emit - not connected:', event);
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
