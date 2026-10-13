import { RealtimeConnectionStatus, RealtimeEvent } from '../types';

export interface CustomerRealtimeContext {
  restaurantId: string;
  tableId: string;
  token: string;
}

export interface RealtimeClientOptions {
  token?: string | null;
  customerContext?: CustomerRealtimeContext | null;
  onStatusChange?: (status: RealtimeConnectionStatus) => void;
  onEvent?: (event: RealtimeEvent) => void;
  onReconnect?: () => void;
}

type EventListener = (data: any, timestamp: string) => void;

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private status: RealtimeConnectionStatus = 'disconnected';
  private options: RealtimeClientOptions;
  private listeners = new Map<string, Set<EventListener>>();
  private reconnectTimeout: number | null = null;
  private pingInterval: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 10000;
  private isIntentionallyClosed = false;

  constructor(options: RealtimeClientOptions) {
    this.options = options;
  }

  public updateCredentials(options: Partial<RealtimeClientOptions>): void {
    const shouldReconnect =
      (options.token !== undefined && options.token !== this.options.token) ||
      (options.customerContext !== undefined &&
        JSON.stringify(options.customerContext) !== JSON.stringify(this.options.customerContext));

    this.options = { ...this.options, ...options };

    if (shouldReconnect) {
      this.reconnect();
    }
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Require either a staff token OR customerContext
    if (!this.options.token && !this.options.customerContext) {
      this.setStatus('disconnected');
      return;
    }

    this.isIntentionallyClosed = false;
    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      let url = `${protocol}//${host}/ws`;

      if (this.options.customerContext) {
        const { restaurantId, tableId, token } = this.options.customerContext;
        url += `?clientType=customer&restaurantId=${encodeURIComponent(restaurantId)}&tableId=${encodeURIComponent(tableId)}&token=${encodeURIComponent(token)}`;
      } else if (this.options.token) {
        url += `?token=${encodeURIComponent(this.options.token)}`;
      }

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        const wasReconnecting = this.status === 'reconnecting' || this.reconnectAttempts > 0;
        this.reconnectAttempts = 0;
        this.setStatus('connected');

        this.startHeartbeat();

        if (wasReconnecting && this.options.onReconnect) {
          this.options.onReconnect();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'pong') {
            return;
          }

          if (payload.event) {
            const realtimeEvent: RealtimeEvent = {
              event: payload.event,
              data: payload.data,
              timestamp: payload.timestamp || new Date().toISOString(),
            };

            // Call global event listener
            if (this.options.onEvent) {
              this.options.onEvent(realtimeEvent);
            }

            // Call registered topic listeners
            const topicListeners = this.listeners.get(payload.event);
            if (topicListeners) {
              topicListeners.forEach((listener) => {
                try {
                  listener(payload.data, realtimeEvent.timestamp);
                } catch (err) {
                  console.error(`Error in event listener for ${payload.event}:`, err);
                }
              });
            }
          }
        } catch {
          // Ignore invalid message
        }
      };

      this.ws.onclose = (event) => {
        this.stopHeartbeat();
        this.ws = null;

        if (this.isIntentionallyClosed) {
          this.setStatus('disconnected');
          return;
        }

        // If 4001 (Unauthorized) or 4003 (Forbidden table context), do not infinite loop reconnect
        if (event.code === 4001 || event.code === 4003) {
          console.warn('Realtime connection rejected by server:', event.reason);
          this.setStatus('disconnected');
          return;
        }

        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // Will trigger onclose
      };
    } catch (err) {
      console.error('Failed to initiate WebSocket connection:', err);
      this.scheduleReconnect();
    }
  }

  private setStatus(newStatus: RealtimeConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      if (this.options.onStatusChange) {
        this.options.onStatusChange(newStatus);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed) return;

    this.setStatus('reconnecting');
    this.reconnectAttempts++;

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);

    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public on(event: string, callback: EventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unbind function
    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  public reconnect(): void {
    this.disconnect();
    this.connect();
  }

  public disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
    this.reconnectAttempts = 0;
  }

  public getStatus(): RealtimeConnectionStatus {
    return this.status;
  }
}
