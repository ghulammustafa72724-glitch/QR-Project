import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Filter,
  Eye,
  Clock,
  User,
  MessageSquare,
  AlertCircle,
  Loader2,
  ChefHat,
  CheckCircle2,
  CheckCheck,
  XCircle,
  UtensilsCrossed,
  ArrowRight,
  TrendingUp,
  Inbox,
  QrCode,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Order, OrderStatus, OrderStatusCounts } from '../types';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { useRealtime, useRealtimeSubscription } from '../context/RealtimeContext';

interface OrdersViewProps {
  onNavigateKitchen: () => void;
  onNavigateTables: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  onNavigateKitchen,
  onNavigateTables,
}) => {
  const { token, restaurant } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [statusCounts, setStatusCounts] = useState<OrderStatusCounts>({
    all: 0,
    pending: 0,
    accepted: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
    active: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Selected Order for Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Reject confirmation modal state
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);

  // Fetch orders from API
  const fetchOrders = useCallback(
    async (showSpinner = false) => {
      if (!token) return;
      if (showSpinner) setIsRefreshing(true);

      try {
        setErrorMessage(null);
        const queryParams = new URLSearchParams();
        if (selectedStatus !== 'all') {
          queryParams.append('status', selectedStatus);
        }
        if (selectedTableId !== 'all') {
          queryParams.append('table_id', selectedTableId);
        }
        if (searchQuery.trim()) {
          queryParams.append('search', searchQuery.trim());
        }

        const res = await fetch(`/api/orders?${queryParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to fetch restaurant orders.');
        }

        const data = await res.json();
        setOrders(data.orders || []);
        if (data.statusCounts) {
          setStatusCounts(data.statusCounts);
        }
      } catch (err: any) {
        console.error('Fetch orders error:', err);
        setErrorMessage(err.message || 'Unable to connect to order server.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, selectedStatus, selectedTableId, searchQuery]
  );

  // Initial load and filter change
  useEffect(() => {
    fetchOrders(true);
  }, [fetchOrders]);

  // Auto-refresh interval (polling every 15 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchOrders(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOrders]);

  // Real-time updates via WebSocket (instant updates on order creations or transitions)
  useRealtimeSubscription('order.created', () => {
    fetchOrders(false);
  });
  useRealtimeSubscription('order.status_changed', () => {
    fetchOrders(false);
  });

  // Handle single order status update
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!token) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update order status.');
      }

      const data = await res.json();

      // Update in state
      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, ...data.order } : ord))
      );

      // If modal is open with this order, update it too
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(data.order);
      }

      // Refresh counts
      fetchOrders(false);
    } catch (err: any) {
      console.error('Update status error:', err);
      throw err;
    }
  };

  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false);
    setSelectedOrder(null);
  };

  // Extract unique tables from current list of orders for the filter dropdown
  const uniqueTables = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => {
      if (o.table_id) {
        map.set(o.table_id, o.table_number_snapshot || o.table_number || 'Table');
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  const statusTabs = [
    { key: 'all', label: 'All Orders', count: statusCounts.all },
    { key: 'pending', label: 'Pending Approval', count: statusCounts.pending, color: 'text-amber-800' },
    { key: 'accepted', label: 'Accepted', count: statusCounts.accepted, color: 'text-indigo-800' },
    { key: 'preparing', label: 'Preparing', count: statusCounts.preparing, color: 'text-sky-800' },
    { key: 'ready', label: 'Ready to Serve', count: statusCounts.ready, color: 'text-emerald-800' },
    { key: 'completed', label: 'Completed', count: statusCounts.completed, color: 'text-stone-700' },
    { key: 'rejected', label: 'Rejected', count: statusCounts.rejected, color: 'text-rose-700' },
    { key: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled, color: 'text-rose-700' },
  ];

  return (
    <div className="max-w-6xl w-full mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
              <UtensilsCrossed className="w-3.5 h-3.5 text-amber-700" />
              <span>{restaurant?.name || 'Restaurant'} Orders</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Order Management
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 font-medium">
              Monitor customer table orders, accept or reject incoming tickets, and track preparation stages.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {/* Auto Refresh Toggle */}
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700 cursor-pointer hover:bg-stone-100 transition-colors select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-3.5 h-3.5 text-amber-600 rounded-sm focus:ring-amber-500 border-stone-300"
              />
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'
                  }`}
                />
                Live Auto-Refresh
              </span>
            </label>

            {/* Manual Refresh Button */}
            <button
              onClick={() => fetchOrders(true)}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 shadow-2xs transition-colors"
              title="Refresh orders now"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
            </button>

            {/* Kitchen Display Link Button */}
            <button
              onClick={onNavigateKitchen}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors"
            >
              <ChefHat className="w-4 h-4" />
              <span>Open Kitchen Display</span>
              {statusCounts.active > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                  {statusCounts.active}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Total
            </span>
            <Inbox className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-2xl font-black text-stone-900">{statusCounts.all}</p>
          <span className="text-[11px] text-stone-500 font-medium">All orders</span>
        </div>

        <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-2xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Pending
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900">{statusCounts.pending}</p>
          <span className="text-[11px] text-amber-800 font-medium">Needs Accept/Reject</span>
        </div>

        <div className="bg-white border border-indigo-200/80 rounded-2xl p-4 shadow-2xs bg-indigo-50/20">
          <div className="flex items-center justify-between text-indigo-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
              Accepted
            </span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-900">{statusCounts.accepted}</p>
          <span className="text-[11px] text-indigo-800 font-medium">In kitchen queue</span>
        </div>

        <div className="bg-white border border-sky-200/80 rounded-2xl p-4 shadow-2xs bg-sky-50/20">
          <div className="flex items-center justify-between text-sky-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
              Preparing
            </span>
            <ChefHat className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-sky-900">{statusCounts.preparing}</p>
          <span className="text-[11px] text-sky-800 font-medium">Currently cooking</span>
        </div>

        <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Ready
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900">{statusCounts.ready}</p>
          <span className="text-[11px] text-emerald-800 font-medium">Awaiting service</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
              Completed
            </span>
            <CheckCheck className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-2xl font-black text-stone-800">{statusCounts.completed}</p>
          <span className="text-[11px] text-stone-500 font-medium">Served orders</span>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="space-y-3">
        {/* Status Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {statusTabs.map((tab) => {
            const isActive = selectedStatus === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedStatus(tab.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Table Select Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #, customer name, or table..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {uniqueTables.length > 0 && (
            <div className="w-full sm:w-56 shrink-0">
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-xs sm:text-sm text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              >
                <option value="all">All Tables ({uniqueTables.length})</option>
                {uniqueTables.map((tbl) => (
                  <option key={tbl.id} value={tbl.id}>
                    {tbl.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(selectedStatus !== 'all' || searchQuery || selectedTableId !== 'all') && (
            <button
              onClick={() => {
                setSelectedStatus('all');
                setSearchQuery('');
                setSelectedTableId('all');
              }}
              className="px-3 py-2.5 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors whitespace-nowrap self-stretch sm:self-auto"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => fetchOrders(true)}
            className="text-xs font-bold underline hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center shadow-xs">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-stone-700">Loading restaurant orders...</p>
        </div>
      ) : orders.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-stone-900">
              {searchQuery || selectedStatus !== 'all' || selectedTableId !== 'all'
                ? 'No matching orders found'
                : 'No customer orders yet'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-500">
              {searchQuery || selectedStatus !== 'all' || selectedTableId !== 'all'
                ? 'Try broadening your search criteria or resetting status filters.'
                : 'Customers can scan your table QR codes to place orders directly into this management console.'}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            {searchQuery || selectedStatus !== 'all' || selectedTableId !== 'all' ? (
              <button
                onClick={() => {
                  setSelectedStatus('all');
                  setSearchQuery('');
                  setSelectedTableId('all');
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                Reset All Filters
              </button>
            ) : (
              <button
                onClick={onNavigateTables}
                className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition-colors shadow-xs flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                <span>View Table QR Codes</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Orders List (Responsive Table on Desktop, Cards on Mobile) */
        <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-xs">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/80 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  <th className="py-3.5 px-4">Order Reference</th>
                  <th className="py-3.5 px-4">Table</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Items Summary</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map((order) => {
                  const createdDate = new Date(order.created_at);
                  const timeFormatted = createdDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const totalItems = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;

                  return (
                    <tr
                      key={order.id}
                      onClick={() => handleOpenDetails(order)}
                      className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                    >
                      {/* Order Number & Timestamp */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-stone-900 text-sm block">
                          #{order.order_number}
                        </span>
                        <span className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {timeFormatted}
                        </span>
                      </td>

                      {/* Dining Table */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-stone-900 block">
                          {order.table_number_snapshot || order.table_number || 'Table'}
                        </span>
                        {order.table_display_label && (
                          <span className="text-[10px] text-stone-500 truncate block max-w-[120px]">
                            {order.table_display_label}
                          </span>
                        )}
                      </td>

                      {/* Customer Name & Notes Flag */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-stone-800">
                          <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate max-w-[110px]">
                            {order.customer_name || 'Walk-in'}
                          </span>
                        </div>
                        {order.customer_note && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-amber-800 bg-amber-100/70 px-1.5 py-0.2 rounded-md font-semibold">
                            <MessageSquare className="w-2.5 h-2.5" />
                            Note
                          </span>
                        )}
                      </td>

                      {/* Items Preview */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-[200px] truncate">
                          <span className="font-semibold text-stone-800">
                            {totalItems} item{totalItems !== 1 ? 's' : ''}:
                          </span>{' '}
                          <span className="text-stone-500">
                            {order.items?.map((i) => `${i.quantity}x ${i.food_name || i.food_name_snapshot}`).join(', ')}
                          </span>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 font-mono font-extrabold text-stone-900 text-sm">
                        Rs {order.total.toFixed(2)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <OrderStatusBadge status={order.status} size="sm" />
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(order.id, 'accepted')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors flex items-center gap-1"
                                title="Accept order and forward to kitchen display"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={() => setRejectingOrder(order)}
                                className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-[11px] transition-colors flex items-center gap-1"
                                title="Reject order (will not show on kitchen display)"
                              >
                                <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {order.status === 'accepted' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'preparing')}
                              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-[11px] shadow-xs transition-colors flex items-center gap-1"
                              title="Start preparing accepted order"
                            >
                              <ChefHat className="w-3 h-3" />
                              <span>Prepare</span>
                            </button>
                          )}

                          {order.status === 'preparing' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'ready')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-xs transition-colors flex items-center gap-1"
                              title="Mark food ready to serve"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Ready</span>
                            </button>
                          )}

                          {order.status === 'ready' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'completed')}
                              className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-[11px] shadow-xs transition-colors flex items-center gap-1"
                              title="Mark order completed"
                            >
                              <CheckCheck className="w-3 h-3" />
                              <span>Complete</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenDetails(order)}
                            className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors"
                            title="Inspect complete order details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Card View */}
          <div className="lg:hidden divide-y divide-stone-100">
            {orders.map((order) => {
              const createdDate = new Date(order.created_at);
              const timeFormatted = createdDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const totalItems = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;

              return (
                <div
                  key={order.id}
                  onClick={() => handleOpenDetails(order)}
                  className="p-4 hover:bg-stone-50/60 active:bg-stone-100/50 transition-colors cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-900 text-sm">
                          #{order.order_number}
                        </span>
                        <OrderStatusBadge status={order.status} size="sm" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                        <span className="font-semibold text-stone-800">
                          {order.table_number_snapshot || order.table_number || 'Table'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-stone-400">
                          <Clock className="w-3 h-3" />
                          {timeFormatted}
                        </span>
                      </div>
                    </div>

                    <span className="text-base font-black font-mono text-stone-900">
                      Rs {order.total.toFixed(2)}
                    </span>
                  </div>

                  {/* Customer & Notes */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
                    <span className="flex items-center gap-1 font-medium">
                      <User className="w-3.5 h-3.5 text-stone-400" />
                      {order.customer_name || 'Walk-in Guest'}
                    </span>
                    {order.customer_note && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                        <MessageSquare className="w-3 h-3" />
                        Kitchen Note
                      </span>
                    )}
                  </div>

                  {/* Items Preview */}
                  <div className="text-xs text-stone-500 line-clamp-1 bg-stone-50 p-2 rounded-xl border border-stone-200/60">
                    <span className="font-bold text-stone-700">{totalItems} items:</span>{' '}
                    {order.items?.map((i) => `${i.quantity}x ${i.food_name || i.food_name_snapshot}`).join(', ')}
                  </div>

                  {/* Action row */}
                  <div
                    className="flex items-center justify-between gap-2 pt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleOpenDetails(order)}
                      className="px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-medium hover:bg-stone-50 transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {order.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'accepted')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => setRejectingOrder(order)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-xs transition-colors flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {order.status === 'accepted' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'preparing')}
                          className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                        >
                          <ChefHat className="w-3.5 h-3.5" />
                          <span>Start Preparing</span>
                        </button>
                      )}

                      {order.status === 'preparing' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'ready')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Ready</span>
                        </button>
                      )}

                      {order.status === 'ready' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'completed')}
                          className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Complete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reject Order Confirmation Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Reject Order #{rejectingOrder.order_number}?
                </h3>
                <p className="text-xs text-stone-500">
                  {rejectingOrder.table_number_snapshot || rejectingOrder.table_number || 'Table'} • {rejectingOrder.customer_name || 'Walk-in Guest'}
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to reject this order? This order will be marked as rejected and <strong>will not be sent to the kitchen display</strong>.
            </p>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-1">
              <div className="flex justify-between font-semibold text-stone-800">
                <span>{rejectingOrder.items?.reduce((s, i) => s + i.quantity, 0) || 0} items</span>
                <span>Rs {rejectingOrder.total.toFixed(2)}</span>
              </div>
              <div className="text-[11px] text-stone-500 truncate">
                {rejectingOrder.items?.map((i) => `${i.quantity}x ${i.food_name || i.food_name_snapshot}`).join(', ')}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = rejectingOrder;
                  setRejectingOrder(null);
                  await handleUpdateStatus(target.id, 'rejected');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Confirm Reject</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetails}
        onStatusUpdate={handleUpdateStatus}
      />
    </div>
  );
};
