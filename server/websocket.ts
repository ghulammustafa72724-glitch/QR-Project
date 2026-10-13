import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'qr_restaurant_secure_jwt_secret_dev_2026';

interface WebSocketClient {
  ws: WebSocket;
  userId?: string;
  name?: string;
  role?: string;
  restaurantId?: string;
  tableId?: string;
  isAlive: boolean;
}

// Maps to track active connections
const restaurantClients = new Map<string, Set<WebSocketClient>>();
const tableClients = new Map<string, Set<WebSocketClient>>();

let wss: WebSocketServer | null = null;

export function initWebSocket(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/ws') {
        wss!.handleUpgrade(request, socket, head, (ws) => {
          wss!.emit('connection', ws, request);
        });
      }
    } catch (err) {
      console.error('WebSocket upgrade error:', err);
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, request) => {
    const client: WebSocketClient = {
      ws,
      isAlive: true,
    };

    try {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      const token = url.searchParams.get('token');
      const restaurantIdParam = url.searchParams.get('restaurantId');
      const tableIdParam = url.searchParams.get('tableId');

      if (token) {
        // Authenticated staff or owner connection
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
          client.userId = decoded.userId;
          client.role = decoded.role;

          // Lookup user in database
          const stmt = db.prepare('SELECT id, name, role, restaurant_id FROM users WHERE id = ? AND status = "active"');
          const user = stmt.get(decoded.userId) as { id: string; name: string; role: string; restaurant_id?: string } | undefined;

          if (user) {
            client.name = user.name;
            client.role = user.role;

            let restaurantId = user.restaurant_id;
            if (!restaurantId && (user.role === 'restaurant_owner' || user.role === 'owner')) {
              const restStmt = db.prepare('SELECT id FROM restaurants WHERE owner_id = ?');
              const rest = restStmt.get(user.id) as { id: string } | undefined;
              if (rest) restaurantId = rest.id;
            }

            if (restaurantId) {
              client.restaurantId = restaurantId;
              addClientToRestaurant(restaurantId, client);
            }
          }
        } catch {
          // Token invalid, connection can still receive public messages if restaurantId provided
        }
      }

      // Public table / customer connection
      if (restaurantIdParam) {
        client.restaurantId = restaurantIdParam;
        addClientToRestaurant(restaurantIdParam, client);

        if (tableIdParam) {
          client.tableId = tableIdParam;
          addClientToTable(restaurantIdParam, tableIdParam, client);
        }
      }

      // Send initial welcome message
      ws.send(JSON.stringify({
        event: 'connected',
        data: {
          message: 'Real-time WebSocket connection established.',
          restaurantId: client.restaurantId,
          tableId: client.tableId,
          role: client.role,
          timestamp: new Date().toISOString(),
        }
      }));

    } catch (err) {
      console.error('Error establishing WebSocket client state:', err);
    }

    // Ping / Pong handlers
    ws.on('pong', () => {
      client.isAlive = true;
    });

    // Inbound messages (e.g. client requesting ping or room join)
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ event: 'pong', timestamp: Date.now() }));
        } else if (message.type === 'subscribe_table' && message.restaurantId && message.tableId) {
          client.restaurantId = message.restaurantId;
          client.tableId = message.tableId;
          addClientToRestaurant(message.restaurantId, client);
          addClientToTable(message.restaurantId, message.tableId, client);
          ws.send(JSON.stringify({ event: 'subscribed', data: { tableId: message.tableId } }));
        }
      } catch {
        // Ignore unparseable client messages
      }
    });

    ws.on('close', () => {
      removeClient(client);
    });

    ws.on('error', () => {
      removeClient(client);
    });
  });

  // Keep-alive heartbeat interval every 30 seconds
  const heartbeat = setInterval(() => {
    if (!wss) return;
    for (const ws of wss.clients) {
      const client = ws as any;
      if (client._isAlive === false) {
        ws.terminate();
      } else {
        client._isAlive = false;
        ws.ping();
      }
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  console.log('Real-Time WebSocket server initialized on route /ws');
  return wss;
}

function addClientToRestaurant(restaurantId: string, client: WebSocketClient) {
  if (!restaurantClients.has(restaurantId)) {
    restaurantClients.set(restaurantId, new Set());
  }
  restaurantClients.get(restaurantId)!.add(client);
}

function addClientToTable(restaurantId: string, tableId: string, client: WebSocketClient) {
  const key = `${restaurantId}:${tableId}`;
  if (!tableClients.has(key)) {
    tableClients.set(key, new Set());
  }
  tableClients.get(key)!.add(client);
}

function removeClient(client: WebSocketClient) {
  if (client.restaurantId && restaurantClients.has(client.restaurantId)) {
    restaurantClients.get(client.restaurantId)!.delete(client);
    if (restaurantClients.get(client.restaurantId)!.size === 0) {
      restaurantClients.delete(client.restaurantId);
    }
  }

  if (client.restaurantId && client.tableId) {
    const key = `${client.restaurantId}:${client.tableId}`;
    if (tableClients.has(key)) {
      tableClients.get(key)!.delete(client);
      if (tableClients.get(key)!.size === 0) {
        tableClients.delete(key);
      }
    }
  }
}

/**
 * Broadcast an event to all connected clients belonging to a specific restaurant.
 * (e.g. owners, managers, waiters, kitchen staff)
 */
export function broadcastToRestaurant(restaurantId: string, event: string, data: any) {
  const clients = restaurantClients.get(restaurantId);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(payload);
      } catch (err) {
        console.error('Failed to send WS message to client:', err);
      }
    }
  }
}

/**
 * Broadcast an event to customers at a specific restaurant table.
 * (e.g. order status update, service request acknowledgment)
 */
export function broadcastToTable(restaurantId: string, tableId: string, event: string, data: any) {
  const key = `${restaurantId}:${tableId}`;
  const clients = tableClients.get(key);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(payload);
      } catch (err) {
        console.error('Failed to send WS message to table client:', err);
      }
    }
  }
}
