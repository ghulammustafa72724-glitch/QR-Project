import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Store,
  TrendingUp,
  DollarSign,
  ClipboardList,
  ChefHat,
  Bell,
  Users,
  UtensilsCrossed,
  QrCode,
  Settings,
  RefreshCw,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  Plus,
  Printer,
  Sparkles,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCheck,
  XCircle,
  Radio,
  Flame,
  LayoutDashboard,
  Timer,
  ShoppingBag,
  Sliders,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime, useRealtimeSubscription } from '../context/RealtimeContext';
import {
  Order,
  OrderStatus,
  OrderStatsSummary,
  RestaurantTable,
  Category,
  FoodItem,
  StaffMember,
  ServiceRequest,
} from '../types';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { formatCurrency, formatAmount } from '../utils/currency';

interface DashboardViewProps {
  onNavigateProfile: () => void;
  onNavigateMenu: () => void;
  onNavigateTables: () => void;
  onNavigateOrders: () => void;
  onNavigateKitchen: () => void;
  onNavigateWaiter?: () => void;
  onNavigateStaff?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateProfile,
  onNavigateMenu,
  onNavigateTables,
  onNavigateOrders,
  onNavigateKitchen,
  onNavigateWaiter,
  onNavigateStaff,
}) => {
  const { user, restaurant, token } = useAuth();
  const { status: realtimeStatus } = useRealtime();

  // Primary data states
  const [stats, setStats] = useState<OrderStatsSummary>({
    totalOrders: 0,
    totalRevenue: 0,
    activeOrders: 0,
    pendingOrders: 0,
    acceptedOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    rejectedOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all');
  const [quickSearch, setQuickSearch] = useState('');

  // Clock
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch full dashboard data bundle
  const fetchDashboardData = useCallback(
    async (showSpinner = false) => {
      if (!token) return;
      if (showSpinner) setIsRefreshing(true);

      try {
        const headers = { Authorization: `Bearer ${token}` };

        // Concurrent fetching for snappy load times
        const [statsRes, ordersRes, tablesRes, catRes, foodRes, staffRes, reqRes] =
          await Promise.all([
            fetch('/api/orders/stats/summary', { headers }).catch(() => null),
            fetch('/api/orders?limit=15', { headers }).catch(() => null),
            fetch('/api/tables', { headers }).catch(() => null),
            fetch('/api/categories', { headers }).catch(() => null),
            fetch('/api/food-items', { headers }).catch(() => null),
            fetch('/api/staff', { headers }).catch(() => null),
            fetch('/api/service-requests?status=active', { headers }).catch(() => null),
          ]);

        if (statsRes && statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (ordersRes && ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setRecentOrders(ordersData.orders || []);
        }

        if (tablesRes && tablesRes.ok) {
          const tablesData = await tablesRes.json();
          setTables(tablesData.tables || []);
        }

        if (catRes && catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }

        if (foodRes && foodRes.ok) {
          const foodData = await foodRes.json();
          setFoodItems(foodData.foodItems || []);
        }

        if (staffRes && staffRes.ok) {
          const staffData = await staffRes.json();
          setStaff(staffData.staff || []);
        }

        if (reqRes && reqRes.ok) {
          const reqData = await reqRes.json();
          setServiceRequests(reqData.requests || []);
        }

        setLastRefreshedAt(new Date());
      } catch (err) {
        console.error('Failed to fetch dashboard intelligence:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time automatic updates
  useRealtimeSubscription(
    'order:created',
    useCallback(() => {
      fetchDashboardData();
      setActionSuccessNotice('New guest order placed just now');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    }, [fetchDashboardData])
  );

  useRealtimeSubscription(
    'order:status_changed',
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  useRealtimeSubscription(
    'service_request:created',
    useCallback(() => {
      fetchDashboardData();
      setActionSuccessNotice('New table service request received');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    }, [fetchDashboardData])
  );

  useRealtimeSubscription(
    'table:status_changed',
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  // Quick order status transition
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
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
      if (res.ok) {
        setActionSuccessNotice(`Order status updated to ${newStatus}`);
        setTimeout(() => setActionSuccessNotice(null), 3500);
        await fetchDashboardData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update order status');
      }
    } catch {
      alert('Network failure updating order');
    }
  };

  // Quick toggle food item stock availability
  const handleToggleFoodAvailability = async (item: FoodItem) => {
    if (!token) return;
    try {
      const newAvail = item.is_available ? 0 : 1;
      const res = await fetch(`/api/food-items/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...item,
          is_available: newAvail,
        }),
      });
      if (res.ok) {
        setFoodItems((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, is_available: newAvail } : f))
        );
        setActionSuccessNotice(
          `${item.name} is now ${newAvail ? 'In Stock (Available)' : 'Out of Stock (Hidden)'}`
        );
        setTimeout(() => setActionSuccessNotice(null), 3000);
      }
    } catch (err) {
      console.error('Failed to toggle food availability', err);
    }
  };

  // Derived metrics
  const activeTablesCount = useMemo(
    () => tables.filter((t) => t.is_active === 1).length,
    [tables]
  );

  const occupiedTablesCount = useMemo(
    () =>
      tables.filter((t) => t.is_active === 1 && t.operational_status === 'occupied').length,
    [tables]
  );

  const availableTablesCount = useMemo(
    () =>
      tables.filter((t) => t.is_active === 1 && (t.operational_status === 'available' || !t.operational_status)).length,
    [tables]
  );

  const needsServiceTablesCount = useMemo(
    () =>
      tables.filter((t) => t.operational_status === 'needs_service' || t.operational_status === 'needs_clearing').length,
    [tables]
  );

  const outOfStockFoodsCount = useMemo(
    () => foodItems.filter((f) => f.is_available === 0).length,
    [foodItems]
  );

  const activeStaffCount = useMemo(
    () => staff.filter((s) => s.status === 'active').length,
    [staff]
  );

  // Active Kitchen Queue count
  const kitchenQueueCount = useMemo(
    () => stats.acceptedOrders + stats.preparingOrders,
    [stats]
  );

  // Average order value
  const avgOrderValue = useMemo(() => {
    if (!stats.totalOrders || stats.totalOrders === 0) return 0;
    return Math.round((stats.totalRevenue / stats.totalOrders) * 100) / 100;
  }, [stats]);

  // Filtered orders list for the dashboard live queue
  const filteredOrders = useMemo(() => {
    return recentOrders.filter((order) => {
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'pending'
          ? order.status === 'pending'
          : statusFilter === 'preparing'
          ? order.status === 'preparing' || order.status === 'accepted'
          : order.status === 'ready';

      const q = quickSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        order.order_number.toLowerCase().includes(q) ||
        (order.table_number && order.table_number.toLowerCase().includes(q)) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [recentOrders, statusFilter, quickSearch]);

  const activeCallsCount = serviceRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Toast Notification Banner */}
      {actionSuccessNotice && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-stone-900 text-white shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2 border border-stone-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessNotice}</span>
        </div>
      )}

      {/* Top Operations Header Bar */}
      <section className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-bold tracking-tight">
                <Store className="w-3.5 h-3.5 text-amber-600" />
                {restaurant?.name || 'Restaurant Headquarters'}
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-medium">
                <Clock className="w-3.5 h-3.5 text-stone-500" />
                <span className="font-mono tabular-nums">{currentTime}</span>
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                  realtimeStatus === 'connected'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                    : 'bg-amber-50 text-amber-800 border-amber-200/80'
                }`}
                title={`WebSocket real-time engine: ${realtimeStatus}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    realtimeStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span>{realtimeStatus === 'connected' ? 'Live Telemetry' : 'Syncing'}</span>
              </span>
            </div>

            <div className="flex items-baseline gap-2 pt-0.5">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                Operations Command Center
              </h1>

            </div>
          </div>

          {/* Quick Actions Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
              title="Refresh live metrics from server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {onNavigateWaiter && (
              <button
                onClick={onNavigateWaiter}
                className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Waiter Station</span>
                {activeCallsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white animate-bounce">
                    {activeCallsCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={onNavigateKitchen}
              className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <ChefHat className="w-3.5 h-3.5 text-amber-400" />
              <span>Kitchen (KDS)</span>
              {kitchenQueueCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-md bg-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">
                  {kitchenQueueCount}
                </span>
              )}
            </button>

            <button
              onClick={onNavigateProfile}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Restaurant Profile & Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Urgent Operational Attention Strip (conditional) */}
      {(stats.pendingOrders > 0 || activeCallsCount > 0 || outOfStockFoodsCount > 0) && (
        <section className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 font-medium text-amber-900">
            <Flame className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
            <span>
              <strong>Active attention items:</strong>{' '}
              {stats.pendingOrders > 0 && (
                <span className="mr-3 font-semibold text-rose-700">
                  • {stats.pendingOrders} pending order{stats.pendingOrders > 1 ? 's' : ''} awaiting approval
                </span>
              )}
              {activeCallsCount > 0 && (
                <span className="mr-3 font-semibold text-sky-700">
                  • {activeCallsCount} pending table call{activeCallsCount > 1 ? 's' : ''}
                </span>
              )}
              {outOfStockFoodsCount > 0 && (
                <span className="text-stone-600">
                  • {outOfStockFoodsCount} dish{outOfStockFoodsCount > 1 ? 'es' : ''} marked 86 / out of stock
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {stats.pendingOrders > 0 && (
              <button
                onClick={onNavigateOrders}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
              >
                Review Pending ({stats.pendingOrders})
              </button>
            )}
            {activeCallsCount > 0 && onNavigateWaiter && (
              <button
                onClick={onNavigateWaiter}
                className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
              >
                Open Waiter Desk ({activeCallsCount})
              </button>
            )}
          </div>
        </section>
      )}

      {/* 4 Primary Operational Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Revenue */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
                Total Revenue
              </span>
              <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight font-mono tabular-nums mt-1">
                {formatCurrency(stats.totalRevenue)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Avg Order Value</span>
            <span className="font-mono font-bold text-stone-800 tabular-nums">
              {formatCurrency(avgOrderValue)}
            </span>
          </div>
        </div>

        {/* Card 2: Active Orders / Flow */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
                Active Orders
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight font-mono tabular-nums mt-1 flex items-baseline gap-2">
                <span>{stats.activeOrders}</span>
                <span className="text-xs font-semibold text-stone-400 font-sans">
                  of {stats.totalOrders} total
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {stats.pendingOrders} pending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              {stats.preparingOrders} in prep
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {stats.readyOrders} ready
            </span>
          </div>
        </div>

        {/* Card 3: Floor & Tables Pulse */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
                Floor Occupancy
              </span>
              <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight font-mono tabular-nums mt-1 flex items-baseline gap-2">
                <span>{occupiedTablesCount}</span>
                <span className="text-xs font-semibold text-stone-400 font-sans">
                  / {activeTablesCount} tables active
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/60 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span className="text-emerald-700 font-semibold">
              {availableTablesCount} available
            </span>
            {needsServiceTablesCount > 0 ? (
              <span className="text-amber-700 font-bold">
                {needsServiceTablesCount} need service
              </span>
            ) : (
              <span className="text-stone-400">All tables clean</span>
            )}
          </div>
        </div>

        {/* Card 4: Kitchen Workload */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
                Kitchen Tickets
              </span>
              <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight font-mono tabular-nums mt-1 flex items-baseline gap-2">
                <span>{kitchenQueueCount}</span>
                <span className="text-xs font-semibold text-stone-400 font-sans">
                  active on KDS
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-stone-900 text-amber-400 shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span className="text-stone-600 font-medium">
              {stats.completedOrders} orders fulfilled
            </span>
            <button
              onClick={onNavigateKitchen}
              className="text-amber-700 hover:text-amber-800 font-bold inline-flex items-center gap-0.5 cursor-pointer"
            >
              <span>View KDS</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* Main Grid: Live Orders Table (2/3) + Real-Time Status Widgets (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Orders Console */}
        <section className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
            {/* Header + Filters */}
            <div className="p-4 sm:p-5 border-b border-stone-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/50">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-stone-900 tracking-tight">
                      Live Orders Console
                    </h2>
                    <p className="text-xs text-stone-500">
                      Recent guest orders placed via table QR codes
                    </p>
                  </div>
                </div>

                <button
                  onClick={onNavigateOrders}
                  className="self-start sm:self-auto inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
                >
                  <span>Full Orders Manager</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status Filter Tabs & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {(
                    [
                      { id: 'all', label: 'All Recent', count: recentOrders.length },
                      { id: 'pending', label: 'Pending', count: stats.pendingOrders },
                      { id: 'preparing', label: 'In Prep', count: stats.preparingOrders + stats.acceptedOrders },
                      { id: 'ready', label: 'Ready', count: stats.readyOrders },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                        statusFilter === tab.id
                          ? 'bg-stone-900 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          statusFilter === tab.id ? 'bg-stone-800 text-stone-200' : 'bg-white text-stone-600'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative sm:w-48">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    placeholder="Search order or table..."
                    className="w-full pl-8 pr-3 py-1 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-900 placeholder-stone-400 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Orders List / Empty State */}
            {isLoading ? (
              <div className="p-8 text-center text-stone-500 text-xs space-y-2">
                <RefreshCw className="w-6 h-6 text-amber-600 animate-spin mx-auto" />
                <p>Loading live customer orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-stone-800">No matching orders found</p>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    {quickSearch
                      ? 'No orders match your filter criteria.'
                      : 'When guests scan table QR codes and submit food orders, they appear here instantly.'}
                  </p>
                </div>
                {tables.length > 0 && (
                  <button
                    onClick={onNavigateTables}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>View Table QR Codes</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-stone-100 max-h-[500px] overflow-y-auto">
                {filteredOrders.map((order) => {
                  const isPending = order.status === 'pending';
                  const isAccepted = order.status === 'accepted';
                  const isPreparing = order.status === 'preparing';
                  const isReady = order.status === 'ready';

                  return (
                    <div
                      key={order.id}
                      className="p-3.5 sm:p-4 hover:bg-stone-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-stone-900 text-sm">
                            {order.order_number}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 font-semibold text-stone-700">
                            Table {order.table_number || order.table_number_snapshot || '—'}
                          </span>
                          <OrderStatusBadge status={order.status} size="sm" />
                          <span className="text-stone-400 font-mono text-[11px]">
                            {new Date(order.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="text-stone-600 truncate flex items-center gap-2">
                          <span className="font-medium">
                            {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}:
                          </span>
                          <span className="text-stone-500 truncate">
                            {order.items?.map((it) => `${it.quantity}x ${it.food_name_snapshot || it.food_name}`).join(', ')}
                          </span>
                        </div>

                        {order.customer_note && (
                          <div className="text-[11px] text-amber-700 italic bg-amber-50/60 px-2 py-0.5 rounded inline-block">
                            Note: {order.customer_note}
                          </div>
                        )}
                      </div>

                      {/* Right side: Total + Status Shortcuts */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                        <div className="text-right">
                          <span className="font-mono font-black text-stone-900 text-sm block">
                            {formatCurrency(order.total)}
                          </span>
                          <span className="text-[10px] text-stone-400 block uppercase">
                            Direct Total
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Quick Transitions */}
                          {isPending && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'accepted')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
                              title="Accept order and send to kitchen"
                            >
                              Accept
                            </button>
                          )}

                          {isAccepted && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors cursor-pointer"
                              title="Send into cooking"
                            >
                              Cook
                            </button>
                          )}

                          {isPreparing && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer"
                              title="Mark food ready to serve"
                            >
                              Ready
                            </button>
                          )}

                          {isReady && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                              className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors cursor-pointer"
                              title="Mark fulfilled and completed"
                            >
                              Complete
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                            title="Inspect complete order details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </section>

        {/* Right Column: Live Floor, Menu Stock Controls, and Restaurant Identity */}
        <section className="space-y-6">
          {/* Floor & Table Status Live Grid */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Floor Layout Pulse</h3>
                  <p className="text-[11px] text-stone-500">Real-time table occupancy</p>
                </div>
              </div>

              <button
                onClick={onNavigateTables}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Manage</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {tables.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-stone-50 border border-dashed border-stone-200 text-xs text-stone-500">
                <p>No tables registered yet.</p>
                <button
                  onClick={onNavigateTables}
                  className="mt-2 text-amber-700 font-bold underline cursor-pointer"
                >
                  Create first dining table
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                {tables.slice(0, 12).map((tbl) => {
                  const status = tbl.operational_status || 'available';
                  const isOccupied = status === 'occupied';
                  const isNeedsService = status === 'needs_service';
                  const isNeedsClearing = status === 'needs_clearing';

                  const badgeClass = isOccupied
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : isNeedsService
                    ? 'bg-sky-100 text-sky-900 border-sky-300 animate-pulse'
                    : isNeedsClearing
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200';

                  return (
                    <div
                      key={tbl.id}
                      className={`p-2 rounded-xl border text-center transition-all ${badgeClass}`}
                      title={`Table ${tbl.table_number}: ${status}`}
                    >
                      <div className="text-xs font-black">T-{tbl.table_number}</div>
                      <div className="text-[9px] font-semibold uppercase tracking-wider truncate">
                        {isOccupied
                          ? 'Dine In'
                          : isNeedsService
                          ? 'Service'
                          : isNeedsClearing
                          ? 'Clear'
                          : 'Open'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Open ({availableTablesCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Occupied ({occupiedTablesCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                Call ({needsServiceTablesCount})
              </span>
            </div>
          </div>

          {/* Menu Stock Availability Quick Controls */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/50">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Digital Menu Pulse</h3>
                  <p className="text-[11px] text-stone-500">
                    {categories.length} categories • {foodItems.length} dishes
                  </p>
                </div>
              </div>

              <button
                onClick={onNavigateMenu}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Edit Menu</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Quick 86 stock toggle for top dishes */}
            <div className="space-y-2 pt-1 max-h-60 overflow-y-auto divide-y divide-stone-100 text-xs">
              {foodItems.slice(0, 6).map((item) => (
                <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-stone-900 block truncate">{item.name}</span>
                    <span className="font-mono text-[11px] text-stone-500">
                      {formatCurrency(item.price)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleFoodAvailability(item)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
                      item.is_available
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                    title="Toggle food stock availability on customer QR menu"
                  >
                    {item.is_available ? 'In Stock' : '86 / Sold Out'}
                  </button>
                </div>
              ))}
            </div>

            {outOfStockFoodsCount > 0 && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{outOfStockFoodsCount} dish(es) currently marked out of stock.</span>
              </div>
            )}
          </div>

          {/* Restaurant Operational Profile & Account Identity */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-stone-100 text-stone-700">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Restaurant Settings</h3>
                  <p className="text-[11px] text-stone-500">Profile & credentials</p>
                </div>
              </div>

              <button
                onClick={onNavigateProfile}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Edit Profile</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-stone-600 bg-stone-50/70 p-3 rounded-xl border border-stone-200/60">
              <div className="flex justify-between">
                <span className="text-stone-400">Business Name</span>
                <span className="font-semibold text-stone-900 truncate max-w-[180px]">
                  {restaurant?.name || 'Restaurant'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Owner User</span>
                <span className="font-semibold text-stone-900">{user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Owner Email</span>
                <span className="text-stone-700 truncate max-w-[180px]">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Active Staff</span>
                <span className="font-semibold text-stone-900">{activeStaffCount} member(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Standard Currency</span>
                <span className="font-bold text-stone-900 font-mono">Rs (PKR)</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Order Details Modal Integration */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
        }}
        onStatusUpdate={handleUpdateOrderStatus}
      />
    </div>
  );
};
