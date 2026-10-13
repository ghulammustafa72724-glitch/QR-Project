/**
 * System Types & Core Definitions
 */

export type SystemStatus = 'running' | 'idle' | 'maintenance';

export interface ProjectPart {
  partNumber: number;
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'planned';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'restaurant_owner' | 'manager' | 'kitchen_staff' | 'waiter' | 'super_admin';
  status: string;
  restaurant_id?: string;
  createdAt?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  owner_id: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  display_order: number;
  is_active: number; // 1 or 0
  created_at: string;
  updated_at: string;
  food_count?: number;
}

export interface FoodItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  category_name?: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  is_available: number; // 1 or 0
  display_order: number;
  min_prep_time?: number;
  max_prep_time?: number;
  batch_quantity?: number;
  created_at: string;
  updated_at: string;
}

export type TableOperationalStatus = 'available' | 'occupied' | 'needs_service' | 'needs_clearing';

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  table_number: string;
  display_label?: string;
  qr_code_token: string;
  is_active: number; // 1 or 0
  operational_status?: TableOperationalStatus;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  food_item_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  category_name?: string;
  min_prep_time?: number;
  max_prep_time?: number;
  batch_quantity?: number;
}

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'served' | 'cancelled' | 'rejected';

export interface OrderItem {
  id?: string;
  order_id?: string;
  food_item_id?: string;
  food_name_snapshot?: string;
  food_name?: string;
  unit_price_snapshot?: number;
  unit_price?: number;
  quantity: number;
  line_total: number;
}

export interface Order {
  id: string;
  order_number: string;
  restaurant_id: string;
  restaurant_name?: string;
  table_id: string;
  table_number?: string;
  table_number_snapshot?: string;
  table_display_label?: string;
  table_is_active?: number;
  customer_name?: string;
  customer_note?: string;
  subtotal: number;
  total: number;
  status: OrderStatus;
  estimated_prep_min?: number;
  estimated_prep_max?: number;
  created_at: string;
  updated_at?: string;
  items: OrderItem[];
}

export interface OrderStatusCounts {
  all: number;
  pending: number;
  accepted: number;
  preparing: number;
  ready: number;
  completed: number;
  cancelled: number;
  rejected: number;
  active: number;
}

export interface OrdersApiResponse {
  orders: Order[];
  statusCounts: OrderStatusCounts;
  totalCount: number;
  restaurantName?: string;
}

export interface OrderStatsSummary {
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  pendingOrders: number;
  acceptedOrders: number;
  preparingOrders: number;
  readyOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
}

export interface KitchenApiResponse {
  orders: Order[];
  acceptedCount?: number;
  pendingCount: number;
  preparingCount: number;
  readyCount: number;
  totalActive: number;
  restaurantName?: string;
  serverTime?: string;
}

export interface PublicCustomerMenuData {
  status: 'active' | 'inactive';
  message: string;
  restaurant: {
    id: string;
    name: string;
    description?: string;
    address?: string;
    phone?: string;
    logo_url?: string;
  };
  table: {
    id: string;
    table_number: string;
    display_label?: string;
    is_active: number;
    qr_code_token?: string;
  };
  categories: Category[];
  food_items: FoodItem[];
}

export interface AuthResponse {
  message?: string;
  token?: string;
  user: User;
  restaurant?: Restaurant;
  error?: string;
}

// ==========================================
// PART 7: STAFF, SERVICE REQUESTS & REAL-TIME TYPES
// ==========================================

export type StaffRole = 'waiter' | 'kitchen_staff' | 'restaurant_owner';
export type StaffStatus = 'active' | 'inactive';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  status: StaffStatus;
  restaurant_id: string;
  created_at: string;
  updated_at: string;
}

export interface StaffSummaryCounts {
  total: number;
  activeWaiters: number;
  activeKitchen: number;
  inactive: number;
}

export type ServiceRequestType = 'call_waiter' | 'water' | 'bill' | 'cutlery' | 'assistance';
export type ServiceRequestStatus = 'pending' | 'acknowledged' | 'resolved';

export interface ServiceRequest {
  id: string;
  restaurant_id: string;
  table_id: string;
  table_number_snapshot: string;
  table_display_label?: string;
  table_operational_status?: TableOperationalStatus;
  request_type: ServiceRequestType;
  status: ServiceRequestStatus;
  message?: string;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  acknowledged_by_id?: string;
  acknowledged_by_name?: string;
  resolved_by_id?: string;
  resolved_by_name?: string;
}

export interface ServiceRequestsApiResponse {
  requests: ServiceRequest[];
  pendingCount: number;
  acknowledgedCount: number;
  totalActive: number;
}

export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface RealtimeEvent<T = any> {
  event: string;
  data: T;
  timestamp: string;
}

