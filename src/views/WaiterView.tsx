import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell,
  Utensils,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Sparkles,
  Droplets,
  Receipt,
  HelpCircle,
  Layers,
  ArrowRight,
  Loader2,
  User,
  Coffee,
  Check,
  CheckCheck,
  ChevronRight,
  X,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ServiceRequest,
  Order,
  RestaurantTable,
  TableOperationalStatus,
  ServiceRequestType,
} from '../types';
import { useRealtime, useRealtimeSubscription } from '../context/RealtimeContext';

interface WaiterViewProps {
  onNavigateOrders?: () => void;
  onNavigateTables?: () => void;
}

export const WaiterView: React.FC<WaiterViewProps> = ({
  onNavigateOrders,
  onNavigateTables,
}) => {
  const { token, user } = useAuth();
  const { status: realtimeStatus } = useRealtime();

  // Data states
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [allActiveOrders, setAllActiveOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI Filter states
  const [requestFilter, setRequestFilter] = useState<'active' | 'pending' | 'acknowledged' | 'resolved'>('active');
  const [selectedTableForDrawer, setSelectedTableForDrawer] = useState<RestaurantTable | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [alertNotice, setAlertNotice] = useState<string | null>(null);

  // Live timer tick for elapsed time displays
  const [nowTime, setNowTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all waiter operational data
  const fetchData = useCallback(async (isSilent = false) => {
    if (!token) return;
    if (!isSilent) setIsLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [reqRes, tablesRes, ordersRes] = await Promise.all([
        fetch('/api/service-requests?status=all', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/tables', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/orders?status=active', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [reqData, tablesData, ordersData] = await Promise.all([
        reqRes.json(),
        tablesRes.json(),
        ordersRes.json(),
      ]);

      if (reqRes.ok) setServiceRequests(reqData.requests || []);
      if (tablesRes.ok) setTables(tablesData.tables || []);
      if (ordersRes.ok) {
        const orders: Order[] = ordersData.orders || [];
        setAllActiveOrders(orders);
        setReadyOrders(orders.filter((o) => o.status === 'ready'));
      }
    } catch (err: any) {
      console.error('Error fetching waiter data:', err);
      setError('Failed to refresh live data.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to real-time events for instant updates
  useRealtimeSubscription('service_request.created', (data) => {
    if (data.request) {
      setServiceRequests((prev) => {
        // Prevent duplicate cards
        if (prev.some((r) => r.id === data.request.id)) return prev;
        return [data.request, ...prev];
      });
      setAlertNotice(`New request from Table ${data.request.table_number_snapshot}!`);
      setTimeout(() => setAlertNotice(null), 5000);
    }
  });

  useRealtimeSubscription('service_request.updated', (data) => {
    if (data.request) {
      setServiceRequests((prev) =>
        prev.map((r) => (r.id === data.request.id ? { ...r, ...data.request } : r))
      );
    }
  });

  useRealtimeSubscription('order.status_changed', (data) => {
    if (data.order) {
      const updated: Order = data.order;
      if (updated.status === 'ready') {
        setAlertNotice(`Order #${updated.order_number} is READY to serve at Table ${updated.table_number_snapshot}!`);
        setTimeout(() => setAlertNotice(null), 6000);
      }
      fetchData(true);
    }
  });

  useRealtimeSubscription('order.created', () => {
    fetchData(true);
  });

  useRealtimeSubscription('table.status_changed', (data) => {
    if (data.tableId && data.operationalStatus) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === data.tableId ? { ...t, operational_status: data.operationalStatus } : t
        )
      );
    }
  });

  // Action: Acknowledge request
  const handleAcknowledge = async (requestId: string) => {
    if (!token) return;
    setActionInProgress(requestId);
    try {
      const res = await fetch(`/api/service-requests/${requestId}/acknowledge`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.request) {
        setServiceRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, ...data.request } : r))
        );
      }
    } catch (err) {
      console.error('Error acknowledging request:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Action: Resolve request
  const handleResolve = async (requestId: string) => {
    if (!token) return;
    setActionInProgress(requestId);
    try {
      const res = await fetch(`/api/service-requests/${requestId}/resolve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.request) {
        setServiceRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, ...data.request } : r))
        );
        fetchData(true);
      }
    } catch (err) {
      console.error('Error resolving request:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Action: Mark order completed / served
  const handleMarkOrderServed = async (orderId: string) => {
    if (!token) return;
    setActionInProgress(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (res.ok) {
        fetchData(true);
      }
    } catch (err) {
      console.error('Error marking order served:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Action: Change table operational state
  const handleUpdateTableStatus = async (tableId: string, targetStatus: TableOperationalStatus) => {
    if (!token) return;
    setActionInProgress(`table-${tableId}`);
    try {
      const res = await fetch(`/api/tables/${tableId}/operational-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ operational_status: targetStatus }),
      });
      const data = await res.json();
      if (res.ok && data.table) {
        setTables((prev) =>
          prev.map((t) => (t.id === tableId ? { ...t, operational_status: targetStatus } : t))
        );
        if (selectedTableForDrawer && selectedTableForDrawer.id === tableId) {
          setSelectedTableForDrawer({ ...selectedTableForDrawer, operational_status: targetStatus });
        }
      }
    } catch (err) {
      console.error('Error updating table status:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Compute metrics
  const activeRequests = useMemo(
    () => serviceRequests.filter((r) => r.status === 'pending' || r.status === 'acknowledged'),
    [serviceRequests]
  );

  const pendingRequests = useMemo(
    () => serviceRequests.filter((r) => r.status === 'pending'),
    [serviceRequests]
  );

  const acknowledgedRequests = useMemo(
    () => serviceRequests.filter((r) => r.status === 'acknowledged'),
    [serviceRequests]
  );

  const resolvedRequests = useMemo(
    () => serviceRequests.filter((r) => r.status === 'resolved'),
    [serviceRequests]
  );

  const displayedRequests = useMemo(() => {
    if (requestFilter === 'active') return activeRequests;
    if (requestFilter === 'pending') return pendingRequests;
    if (requestFilter === 'acknowledged') return acknowledgedRequests;
    return resolvedRequests;
  }, [requestFilter, activeRequests, pendingRequests, acknowledgedRequests, resolvedRequests]);

  const activeTablesCount = useMemo(
    () => tables.filter((t) => t.operational_status === 'occupied' || t.operational_status === 'needs_service').length,
    [tables]
  );

  const getRequestTypeMeta = (type: ServiceRequestType) => {
    switch (type) {
      case 'water':
        return { label: 'Water Request', icon: <Droplets className="w-4 h-4 text-cyan-600" />, bg: 'bg-cyan-50 border-cyan-200 text-cyan-800' };
      case 'bill':
        return { label: 'Bill / Check', icon: <Receipt className="w-4 h-4 text-emerald-600" />, bg: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
      case 'cutlery':
        return { label: 'Cutlery & Napkins', icon: <Utensils className="w-4 h-4 text-amber-600" />, bg: 'bg-amber-50 border-amber-200 text-amber-800' };
      case 'assistance':
        return { label: 'Need Assistance', icon: <HelpCircle className="w-4 h-4 text-purple-600" />, bg: 'bg-purple-50 border-purple-200 text-purple-800' };
      case 'call_waiter':
      default:
        return { label: 'Call Waiter', icon: <Bell className="w-4 h-4 text-rose-600" />, bg: 'bg-rose-50 border-rose-200 text-rose-800' };
    }
  };

  const getElapsedString = (createdIso: string) => {
    const diffSec = Math.max(0, Math.floor((nowTime - new Date(createdIso).getTime()) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const mins = Math.floor(diffSec / 60);
    return `${mins}m ago`;
  };

  const isUrgent = (createdIso: string) => {
    const diffSec = Math.floor((nowTime - new Date(createdIso).getTime()) / 1000);
    return diffSec > 180; // Over 3 minutes is urgent
  };

  return (
    <div className="py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
              Part 7: Waiter Station
            </span>
            <span className="text-xs text-stone-400">•</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span
                className={`w-2 h-2 rounded-full ${
                  realtimeStatus === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : realtimeStatus === 'reconnecting'
                    ? 'bg-amber-500 animate-ping'
                    : 'bg-rose-500'
                }`}
              />
              <span className={realtimeStatus === 'connected' ? 'text-emerald-700' : 'text-stone-500'}>
                {realtimeStatus === 'connected'
                  ? 'Real-Time Sync Active'
                  : realtimeStatus === 'reconnecting'
                  ? 'Reconnecting...'
                  : 'Offline (Polling fallback)'}
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-black text-stone-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-sky-600" />
            Waiter Operations & Table Dispatch
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Real-time customer table calls, ready-to-serve food tickets, and floor service tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors disabled:opacity-50"
            title="Refresh active state"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Alert Pop Notification */}
      {alertNotice && (
        <div className="p-4 bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-between shadow-lg animate-bounce">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 shrink-0 animate-pulse" />
            <span>{alertNotice}</span>
          </div>
          <button onClick={() => setAlertNotice(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-rose-600 block mb-1 flex items-center gap-1">
            <Bell className="w-3.5 h-3.5" /> Pending Calls
          </span>
          <span className="text-2xl font-black text-rose-900">{pendingRequests.length}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-600 block mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Serve
          </span>
          <span className="text-2xl font-black text-emerald-900">{readyOrders.length}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-sky-600 block mb-1 flex items-center gap-1">
            <Coffee className="w-3.5 h-3.5" /> Active Tables
          </span>
          <span className="text-2xl font-black text-sky-900">{activeTablesCount}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 block mb-1">Total Active Orders</span>
          <span className="text-2xl font-black text-stone-900">{allActiveOrders.length}</span>
        </div>
      </div>

      {/* SECTION 1: CUSTOMER SERVICE REQUESTS (HIGH PRIORITY) */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-rose-500 animate-swing" />
              Table Service Requests
              {activeRequests.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                  {activeRequests.length} active
                </span>
              )}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Live guest calls placed from mobile QR menus. Immediate waiter response recommended.
            </p>
          </div>

          {/* Request Filter Tabs */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setRequestFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                requestFilter === 'active' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Active ({activeRequests.length})
            </button>
            <button
              onClick={() => setRequestFilter('pending')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                requestFilter === 'pending' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Pending ({pendingRequests.length})
            </button>
            <button
              onClick={() => setRequestFilter('acknowledged')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                requestFilter === 'acknowledged' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              On The Way ({acknowledgedRequests.length})
            </button>
            <button
              onClick={() => setRequestFilter('resolved')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                requestFilter === 'resolved' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Resolved ({resolvedRequests.length})
            </button>
          </div>
        </div>

        {displayedRequests.length === 0 ? (
          <div className="py-8 text-center text-stone-400">
            <CheckCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-bold text-stone-700">No {requestFilter} service calls</p>
            <p className="text-[11px] text-stone-400">All dining tables are currently satisfied.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedRequests.map((req) => {
              const meta = getRequestTypeMeta(req.request_type);
              const urgent = req.status === 'pending' && isUrgent(req.created_at);

              return (
                <div
                  key={req.id}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${
                    urgent
                      ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-400/20'
                      : req.status === 'acknowledged'
                      ? 'border-sky-300 bg-sky-50/30'
                      : req.status === 'resolved'
                      ? 'border-stone-200 bg-stone-50/50 opacity-70'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-stone-900">
                        Table {req.table_number_snapshot}
                      </span>
                      {req.table_display_label && (
                        <span className="text-[10px] text-stone-500 font-semibold bg-stone-100 px-1.5 py-0.5 rounded">
                          {req.table_display_label}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${meta.bg}`}
                    >
                      {meta.icon}
                      {meta.label}
                    </span>
                  </div>

                  {req.message && (
                    <div className="text-xs text-stone-700 bg-stone-50 p-2.5 rounded-lg border border-stone-200/60 italic">
                      "{req.message}"
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-100">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getElapsedString(req.created_at)}
                    </span>

                    {req.status === 'acknowledged' && req.acknowledged_by_name && (
                      <span className="text-sky-700 font-semibold">
                        Assigned: {req.acknowledged_by_name}
                      </span>
                    )}

                    {req.status === 'resolved' && (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Resolved
                      </span>
                    )}
                  </div>

                  {/* Actions Bar */}
                  {req.status !== 'resolved' && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {req.status === 'pending' ? (
                        <button
                          onClick={() => handleAcknowledge(req.id)}
                          disabled={actionInProgress === req.id}
                          className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                        >
                          {actionInProgress === req.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Acknowledge
                        </button>
                      ) : (
                        <div className="flex items-center justify-center text-xs font-bold text-sky-800 bg-sky-100/60 rounded-lg py-1.5">
                          ✓ On the way
                        </div>
                      )}

                      <button
                        onClick={() => handleResolve(req.id)}
                        disabled={actionInProgress === req.id}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        {actionInProgress === req.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: ORDERS READY TO EXPEDITE & SERVE */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Orders Ready to Serve
              {readyOrders.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  {readyOrders.length} ready
                </span>
              )}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              The kitchen has plated these orders. Deliver to guests and mark served.
            </p>
          </div>

          {onNavigateOrders && (
            <button
              onClick={onNavigateOrders}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              All Orders <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {readyOrders.length === 0 ? (
          <div className="py-8 text-center text-stone-400">
            <Utensils className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-stone-700">No orders awaiting pickup</p>
            <p className="text-[11px] text-stone-400">Kitchen tickets currently in preparation will appear here once ready.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {readyOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/20 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-black text-stone-900 block">
                      Table {order.table_number_snapshot}
                    </span>
                    <span className="text-[11px] font-bold text-stone-500">#{order.order_number}</span>
                  </div>

                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300">
                    Ready to Expedite
                  </span>
                </div>

                {/* Items preview */}
                <div className="space-y-1 bg-white p-2.5 rounded-lg border border-stone-200">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-800">
                        {item.quantity}× {item.food_name || item.food_name_snapshot}
                      </span>
                      <span className="text-stone-500 font-mono">Rs {item.line_total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {order.customer_note && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 italic">
                    Note: "{order.customer_note}"
                  </p>
                )}

                <button
                  onClick={() => handleMarkOrderServed(order.id)}
                  disabled={actionInProgress === order.id}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {actionInProgress === order.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  Mark Served / Completed
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: FLOOR TABLE STATUS GRID */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600" />
              Dining Floor Table Status
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Live operational states. Tap any table to inspect orders or update state.
            </p>
          </div>

          {onNavigateTables && (
            <button
              onClick={onNavigateTables}
              className="text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1"
            >
              Table Settings <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {tables.length === 0 ? (
          <div className="py-8 text-center text-stone-400">
            <p className="text-xs font-semibold">No tables created yet in this restaurant.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {tables.map((table) => {
              const tableActiveOrders = allActiveOrders.filter((o) => o.table_id === table.id);
              const hasReadyOrder = tableActiveOrders.some((o) => o.status === 'ready');
              const hasServiceCall = activeRequests.some((r) => r.table_id === table.id);
              const opStatus = table.operational_status || 'available';

              let statusColor = 'border-stone-200 bg-white text-stone-700';
              let badgeColor = 'bg-stone-100 text-stone-600';
              let statusLabel = 'Available';

              if (opStatus === 'needs_service' || hasServiceCall) {
                statusColor = 'border-rose-400 bg-rose-50/50 text-rose-900 ring-2 ring-rose-400/20';
                badgeColor = 'bg-rose-100 text-rose-800';
                statusLabel = 'Needs Service';
              } else if (hasReadyOrder) {
                statusColor = 'border-emerald-400 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-400/20';
                badgeColor = 'bg-emerald-100 text-emerald-800';
                statusLabel = 'Food Ready';
              } else if (opStatus === 'occupied' || tableActiveOrders.length > 0) {
                statusColor = 'border-sky-300 bg-sky-50/40 text-sky-900';
                badgeColor = 'bg-sky-100 text-sky-800';
                statusLabel = 'Occupied';
              } else if (opStatus === 'needs_clearing') {
                statusColor = 'border-purple-300 bg-purple-50/40 text-purple-900';
                badgeColor = 'bg-purple-100 text-purple-800';
                statusLabel = 'Needs Clearing';
              }

              return (
                <div
                  key={table.id}
                  onClick={() => setSelectedTableForDrawer(table)}
                  className={`p-3.5 rounded-xl border cursor-pointer hover:shadow-md transition-all flex flex-col justify-between ${statusColor}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-black">T{table.table_number}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badgeColor}`}>
                      {statusLabel}
                    </span>
                  </div>

                  {table.display_label && (
                    <span className="text-[10px] text-stone-500 font-medium truncate block mb-2">
                      {table.display_label}
                    </span>
                  )}

                  <div className="pt-2 border-t border-stone-200/50 flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-stone-500">
                      {tableActiveOrders.length} active order{tableActiveOrders.length === 1 ? '' : 's'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DRAWER / MODAL: SELECTED TABLE DETAILS */}
      {selectedTableForDrawer && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                  Table {selectedTableForDrawer.table_number}
                  {selectedTableForDrawer.display_label && (
                    <span className="text-xs font-semibold text-stone-500">
                      ({selectedTableForDrawer.display_label})
                    </span>
                  )}
                </h3>
                <span className="text-xs text-stone-500 font-medium">Table Service Detail & Controls</span>
              </div>
              <button
                onClick={() => setSelectedTableForDrawer(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Change Operational State Control */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-2">Table Operational Status</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['available', 'occupied', 'needs_service', 'needs_clearing'] as TableOperationalStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleUpdateTableStatus(selectedTableForDrawer.id, status)}
                    disabled={actionInProgress === `table-${selectedTableForDrawer.id}`}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold capitalize transition-all border ${
                      (selectedTableForDrawer.operational_status || 'available') === status
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Service Requests for Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Service Requests</h4>
              {serviceRequests.filter((r) => r.table_id === selectedTableForDrawer.id && r.status !== 'resolved').length === 0 ? (
                <p className="text-xs text-stone-400 italic">No pending requests for this table.</p>
              ) : (
                <div className="space-y-2">
                  {serviceRequests
                    .filter((r) => r.table_id === selectedTableForDrawer.id && r.status !== 'resolved')
                    .map((r) => (
                      <div key={r.id} className="p-3 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-stone-900 capitalize block">
                            {r.request_type.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-stone-500">{getElapsedString(r.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {r.status === 'pending' && (
                            <button
                              onClick={() => handleAcknowledge(r.id)}
                              className="px-2.5 py-1 bg-sky-600 text-white rounded-lg text-xs font-bold"
                            >
                              Acknowledge
                            </button>
                          )}
                          <button
                            onClick={() => handleResolve(r.id)}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Active Orders for Table */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Active Food Orders</h4>
              {allActiveOrders.filter((o) => o.table_id === selectedTableForDrawer.id).length === 0 ? (
                <p className="text-xs text-stone-400 italic">No active orders placed for this table right now.</p>
              ) : (
                <div className="space-y-2">
                  {allActiveOrders
                    .filter((o) => o.table_id === selectedTableForDrawer.id)
                    .map((o) => (
                      <div key={o.id} className="p-3 rounded-xl border border-stone-200 bg-white space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-stone-900">#{o.order_number}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold capitalize bg-stone-100 text-stone-700">
                            {o.status}
                          </span>
                        </div>

                        <div className="text-xs text-stone-600 space-y-0.5">
                          {o.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>{it.quantity}× {it.food_name || it.food_name_snapshot}</span>
                              <span className="font-mono text-stone-500">Rs {it.line_total.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {o.status === 'ready' && (
                          <button
                            onClick={() => handleMarkOrderServed(o.id)}
                            className="w-full py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold mt-1"
                          >
                            Mark Served / Completed
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="pt-3 flex justify-end">
              <button
                onClick={() => setSelectedTableForDrawer(null)}
                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
