"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { readToken } from "@/lib/token-store";

type SocketEventHandler = (data: any) => void;

/**
 * WebSocket hook for real-time messaging.
 *
 * Connects to the backend WebSocket gateway with JWT auth.
 * Auto-reconnects on disconnect. Provides event listeners.
 */
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Map<string, Set<SocketEventHandler>>>(new Map());

  useEffect(() => {
    const token = readToken();
    if (!token) return;

    // Connect to API WebSocket (bypass Next.js proxy — direct to port 4000)
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ||
                  (typeof window !== "undefined" ? window.location.origin.replace(/:3000/, ":4000") : "http://127.0.0.1:4000");

    const socket = io(wsUrl, {
      auth: { token },
      query: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    // Forward all registered events
    socket.onAny((event: string, data: any) => {
      const handlers = handlersRef.current.get(event);
      if (handlers) {
        handlers.forEach((h) => h(data));
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, []);

  const on = useCallback((event: string, handler: SocketEventHandler) => {
    const handlers = handlersRef.current.get(event) || new Set();
    handlers.add(handler);
    handlersRef.current.set(event, handlers);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) handlersRef.current.delete(event);
    };
  }, []);

  return { connected, on, socket: socketRef };
}
