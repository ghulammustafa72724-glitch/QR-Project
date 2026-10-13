import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { TokenPayload } from './auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'qr_restaurant_secure_jwt_secret_dev_2026';

export interface StaffSocketMeta {
  type: 'staff';
  userId: string;
  userName: string;
  role: string;
  restaurantId: string;
  isAlive: boolean;
}

export interface CustomerSocketMeta {
  type: 'customer';
  restaurantId: string;
  tableId: string;
  isAlive: boolean;
}

export type SocketMeta = StaffSocketMeta | CustomerSocketMeta;

// Store metadata for each socket
const clientMetaMap = new Map<WebSocket, SocketMeta>();
let wssInstance: WebSocketServer | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

export function initRealtimeServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
  });

  wssInstance = wss;

  wss.on('connection', (ws: WebSocket, req) => {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const clientType = url.searchParams.get('clientType');

      if (clientType === 'customer') {
        // Customer table connection
        const restaurantId = url.searchParams.get('restaurantId');
        const tableId = url.searchParams.get('tableId');
        const token = url.searchParams.get('token');

        if (!restaurantId || !tableId || !token) {
          ws.close(4000, 'Missing customer credentials');
          return;
        }

        // Verify table and token in database
        const stmt = db.prepare(`
          SELECT id, is_active FROM restaurant_tables 
          WHERE id = ? AND restaurant_id = ? AND qr_code_token = ?
        `);
        const table = stmt.get(tableId, restaurantId, token) as { id: string; is_active: number } | undefined;

        if (!table || table.is_active !== 1) {
          ws.close(4003, 'Invalid or inactive table QR session');
          return;
        }

        const meta: CustomerSocketMeta = {
          type: 'customer',
          restaurantId,
          tableId,
          isAlive: true,
        };

        clientMetaMap.set(ws, meta);

        // Send connection established confirmation
        ws.send(JSON.stringify({
          event: 'connection.established',
          data: { type: 'customer', restaurantId, tableId },
          timestamp: new Date().toISOString(),
        }));
      } else {
        // Staff connection (Owner, Waiter, Kitchen Staff)
        const token = url.searchParams.get('token');

        if (!token) {
          ws.close(4001, 'Unauthorized: Token required');
          return;
        }

        let decoded: TokenPayload;
        try {
          decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
        } catch {
          ws.close(4001, 'Unauthorized: Invalid token');
          return;
        }

        // Fetch user from DB
        const userStmt = db.prepare('SELECT id, name, email, role, status, restaurant_id FROM users WHERE id = ?');
        const user = userStmt.get(decoded.userId) as {
          id: string;
          name: string;
          email: string;
          role: string;
          status: string;
          restaurant_id?: string;
        } | undefined;

        if (!user || user.status !== 'active') {
          ws.close(4001, 'Unauthorized: Inactive or invalid user');
          return;
        }

        let restaurantId = user.restaurant_id;
        if (!restaurantId && user.role === 'restaurant_owner') {
          const restStmt = db.prepare('SELECT id FROM restaurants WHERE owner_id = ?');
          const rest = restStmt.get(user.id) as { id: string } | undefined;
          restaurantId = rest?.id;
        }

        if (!restaurantId) {
          ws.close(4004, 'No restaurant associated with this staff account');
          return;
        }

        const meta: StaffSocketMeta = {
          type: 'staff',
          userId: user.id,
          userName: user.name,
          role: user.role,
          restaurantId,
          isAlive: true,
        };

        clientMetaMap.set(ws, meta);

        // Send connection established confirmation
        ws.send(JSON.stringify({
          event: 'connection.established',
          data: {
            type: 'staff',
            userId: user.id,
            userName: user.name,
            role: user.role,
            restaurantId,
          },
          timestamp: new Date().toISOString(),
        }));
      }

      // Heartbeat listener
      ws.on('pong', () => {
        const meta = clientMetaMap.get(ws);
        if (meta) {
          meta.isAlive = true;
        }
      });

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch {
          // Ignore invalid non-JSON messages
        }
      });

      ws.on('close', () => {
        clientMetaMap.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('WebSocket client error:', err);
        clientMetaMap.delete(ws);
      });
    } catch (err) {
      console.error('WebSocket connection error:', err);
      ws.close(4500, 'Internal server error');
    }
  });

  // Heartbeat interval to detect stale/dead connections
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (!wssInstance) return;
    wssInstance.clients.forEach((ws) => {
      const meta = clientMetaMap.get(ws);
      if (!meta) {
        ws.terminate();
        return;
      }
      if (!meta.isAlive) {
        clientMetaMap.delete(ws);
        ws.terminate();
        return;
      }
      meta.isAlive = false;
      ws.ping();
    });
  }, 25000);
  if (heartbeatInterval.unref) {
    heartbeatInterval.unref();
  }

  return wss;
}

// Disconnect a staff member when their account is deactivated or modified
export function disconnectStaffUser(userId: string): void {
  if (!wssInstance) return;
  wssInstance.clients.forEach((ws) => {
    const meta = clientMetaMap.get(ws);
    if (meta && meta.type === 'staff' && meta.userId === userId) {
      ws.close(4001, 'Account deactivated or permissions changed');
      clientMetaMap.delete(ws);
    }
  });
}

// Broadcast event to staff members of a specific restaurant
export function broadcastToRestaurant(
  restaurantId: string,
  event: string,
  data: any,
  allowedRoles?: string[]
): void {
  if (!wssInstance) return;

  const payload = JSON.stringify({
    event,
    data,
    timestamp: new Date().toISOString(),
  });

  wssInstance.clients.forEach((ws) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const meta = clientMetaMap.get(ws);
    if (!meta || meta.type !== 'staff') return;

    if (meta.restaurantId === restaurantId) {
      if (!allowedRoles || allowedRoles.includes(meta.role)) {
        ws.send(payload);
      }
    }
  });
}

// Broadcast event to customer connected to a specific table
export function broadcastToTable(
  restaurantId: string,
  tableId: string,
  event: string,
  data: any
): void {
  if (!wssInstance) return;

  const payload = JSON.stringify({
    event,
    data,
    timestamp: new Date().toISOString(),
  });

  wssInstance.clients.forEach((ws) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const meta = clientMetaMap.get(ws);
    if (!meta || meta.type !== 'customer') return;

    if (meta.restaurantId === restaurantId && meta.tableId === tableId) {
      ws.send(payload);
    }
  });
}

// High-level Domain Event Broadcasters

// 1. Order Created: sent to restaurant staff (owner, kitchen, waiter) AND to customer at table
export function broadcastOrderCreated(restaurantId: string, order: any): void {
  // Staff notification
  broadcastToRestaurant(restaurantId, 'order.created', { order });
  // Customer table notification
  if (order.table_id) {
    broadcastToTable(restaurantId, order.table_id, 'order.created', {
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
      total: order.total,
    });
  }
}

// 2. Order Status Changed: sent to restaurant staff AND to customer at table
export function broadcastOrderStatusChanged(
  restaurantId: string,
  order: any,
  previousStatus: string,
  newStatus: string,
  updatedBy?: string
): void {
  // Staff notification
  broadcastToRestaurant(restaurantId, 'order.status_changed', {
    order,
    previousStatus,
    newStatus,
    updatedBy,
  });
  // Customer table notification
  if (order.table_id) {
    broadcastToTable(restaurantId, order.table_id, 'order.status_changed', {
      orderId: order.id,
      orderNumber: order.order_number,
      previousStatus,
      newStatus,
      updatedAt: new Date().toISOString(),
    });
  }
}

// 3. Service Request Created: sent to staff (owner, waiter) AND to customer at table
export function broadcastServiceRequestCreated(restaurantId: string, request: any): void {
  broadcastToRestaurant(
    restaurantId,
    'service_request.created',
    { request },
    ['restaurant_owner', 'waiter', 'manager']
  );
  if (request.table_id) {
    broadcastToTable(restaurantId, request.table_id, 'service_request.created', {
      requestId: request.id,
      requestType: request.request_type,
      status: request.status,
      createdAt: request.created_at,
    });
  }
}

// 4. Service Request Updated (Acknowledged / Resolved): sent to staff AND customer
export function broadcastServiceRequestUpdated(restaurantId: string, request: any): void {
  broadcastToRestaurant(
    restaurantId,
    'service_request.updated',
    { request },
    ['restaurant_owner', 'waiter', 'manager']
  );
  if (request.table_id) {
    broadcastToTable(restaurantId, request.table_id, 'service_request.updated', {
      requestId: request.id,
      requestType: request.request_type,
      status: request.status,
      acknowledgedAt: request.acknowledged_at,
      resolvedAt: request.resolved_at,
      acknowledgedByName: request.acknowledged_by_name,
    });
  }
}

// 5. Table Operational Status Changed (Available, Occupied, Needs Service, Needs Clearing)
export function broadcastTableStatusChanged(
  restaurantId: string,
  tableId: string,
  operationalStatus: string,
  previousStatus?: string
): void {
  broadcastToRestaurant(
    restaurantId,
    'table.status_changed',
    { tableId, operationalStatus, previousStatus }
  );
}

// 6. Staff Updated (Role changed, deactivated, added)
export function broadcastStaffUpdated(restaurantId: string, staffId: string, action: string): void {
  broadcastToRestaurant(
    restaurantId,
    'staff.updated',
    { staffId, action }
  );
}
