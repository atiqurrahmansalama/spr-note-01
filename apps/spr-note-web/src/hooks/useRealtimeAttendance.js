import { useEffect, useRef, useCallback, useState } from 'react';
import { useTenant } from '../context/TenantContext';

/**
 * Universal Real-Time WebSocket Hook for Live Attendance Sync
 * Enables concurrent multi-teacher / multi-admin attendance collaboration with zero manual reload.
 */
export default function useRealtimeAttendance({ onRemoteUpdate } = {}) {
  const { activeTenantId } = useTenant();
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!activeTenantId || typeof window === 'undefined') return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In dev environment with Vite proxy or standard backend port 8000
      const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
      const wsUrl = `${protocol}//${host}/ws/attendance/${activeTenantId}/`;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Start ping heartbeat every 25 seconds
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping', timestamp: Date.now() }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'attendance_updated' && onRemoteUpdate) {
            onRemoteUpdate(data.payload);
          }
        } catch (err) {
          console.warn('[RealtimeAttendance] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        clearInterval(heartbeatIntervalRef.current);
        // Attempt reconnect after 5s
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        // Silent error - fallback to REST polling
        ws.close();
      };
    } catch {
      // Graceful fallback for non-websocket environments
      setIsConnected(false);
    }
  }, [activeTenantId, onRemoteUpdate]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      clearInterval(heartbeatIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const broadcastUpdate = useCallback((payload) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        action: 'attendance_updated',
        payload: {
          ...payload,
          sender_tenant_id: activeTenantId,
          timestamp: Date.now(),
        }
      }));
    }
  }, [activeTenantId]);

  return {
    isConnected,
    broadcastUpdate,
  };
}
