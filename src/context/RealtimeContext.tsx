import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { RealtimeConnectionStatus, RealtimeEvent } from '../types';
import { RealtimeClient, CustomerRealtimeContext } from '../utils/realtime';
import { useAuth } from './AuthContext';

interface RealtimeContextType {
  status: RealtimeConnectionStatus;
  lastEvent: RealtimeEvent | null;
  subscribe: (event: string, handler: (data: any, timestamp: string) => void) => () => void;
  reconnect: () => void;
  setCustomerContext: (context: CustomerRealtimeContext | null) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [status, setStatus] = useState<RealtimeConnectionStatus>('disconnected');
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [customerContext, setCustomerContextState] = useState<CustomerRealtimeContext | null>(null);

  const clientRef = useRef<RealtimeClient | null>(null);

  // Initialize RealtimeClient once
  useEffect(() => {
    const client = new RealtimeClient({
      token,
      customerContext,
      onStatusChange: (newStatus) => setStatus(newStatus),
      onEvent: (event) => setLastEvent(event),
    });

    clientRef.current = client;

    if (token || customerContext) {
      client.connect();
    }

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, []);

  // Update credentials when token or customerContext changes
  useEffect(() => {
    if (!clientRef.current) return;

    clientRef.current.updateCredentials({
      token,
      customerContext,
    });

    if (token || customerContext) {
      clientRef.current.connect();
    } else {
      clientRef.current.disconnect();
    }
  }, [token, customerContext, user?.status]);

  const subscribe = useCallback(
    (event: string, handler: (data: any, timestamp: string) => void): (() => void) => {
      if (!clientRef.current) {
        return () => {};
      }
      return clientRef.current.on(event, handler);
    },
    []
  );

  const reconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.reconnect();
    }
  }, []);

  const setCustomerContext = useCallback((context: CustomerRealtimeContext | null) => {
    setCustomerContextState(context);
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        status,
        lastEvent,
        subscribe,
        reconnect,
        setCustomerContext,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export function useRealtime(): RealtimeContextType {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

// Convenient hook to subscribe to a specific event
export function useRealtimeSubscription<T = any>(
  event: string,
  handler: (data: T, timestamp: string) => void
): void {
  const { subscribe } = useRealtime();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsubscribe = subscribe(event, (data, timestamp) => {
      if (handlerRef.current) {
        handlerRef.current(data, timestamp);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [event, subscribe]);
}
