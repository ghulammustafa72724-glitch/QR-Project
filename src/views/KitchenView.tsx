import React, { useState, useEffect, useCallback } from 'react';
import {
  ChefHat,
  RefreshCw,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  UtensilsCrossed,
  ArrowLeft,
  Volume2,
  VolumeX,
  Sparkles,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Order, OrderStatus } from '../types';
import { KitchenOrderCard } from '../components/KitchenOrderCard';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { useRealtimeSubscription } from '../context/RealtimeContext';

interface KitchenViewProps {
  onNavigateOrders: () => void;
}

export const KitchenView: React.FC<KitchenViewProps> = ({ onNavigateOrders }) => {
  const { token, restaurant } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [preparingCount, setPreparingCount] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [totalActive, setTotalActive] = useState(0);

  const [filterStation, setFilterStation] = useState<'all' | 'accepted' | 'preparing' | 'ready'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Selected order for modal details
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch kitchen active queue
  const fetchKitchenOrders = useCallback(
    async (showSpinner = false) => {
      if (!token) return;
      if (showSpinner) setIsRefreshing(true);

      try {
        setErrorMessage(null);
        const queryParams = new URLSearchParams();
        if (filterStation !== 'all') {
          queryParams.append('status', filterStation);
        }

        const res = await fetch(`/api/kitchen/orders?${queryParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to fetch kitchen orders.');
        }

        const data = await res.json();
        setOrders(data.orders || []);
        const accCount = data.acceptedCount !== undefined ? data.acceptedCount : (data.pendingCount || 0);
        setAcceptedCount(accCount);
        setPendingCount(accCount);
        setPreparingCount(data.preparingCount || 0);
        setReadyCount(data.readyCount || 0);
        setTotalActive(data.totalActive || 0);
      } catch (err: any) {
        console.error('Fetch kitchen orders error:', err);
        setErrorMessage(err.message || 'Unable to connect to kitchen server.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, filterStation]
  );

  // Initial fetch and on filter change
  useEffect(() => {
    fetchKitchenOrders(true);
  }, [fetchKitchenOrders]);

  // Polling every 10 seconds for real-time kitchen display updates
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchKitchenOrders(false);
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [fetchKitchenOrders]);

  // Real-time synchronization via WebSocket
  useRealtimeSubscription('order.created', () => {
    fetchKitchenOrders(false);
  });
  useRealtimeSubscription('order.status_changed', () => {
    fetchKitchenOrders(false);
  });

  // Update order status from kitchen card
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
        throw new Error(errData.error || 'Failed to update ticket status.');
      }

      const data = await res.json();

      // If status moved to completed or cancelled, remove from kitchen queue
      if (newStatus === 'completed' || newStatus === 'cancelled' || newStatus === 'served') {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        // Otherwise update the order in queue
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, ...data.order } : o))
        );
      }

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(data.order);
      }

      // Re-fetch counts
      fetchKitchenOrders(false);
    } catch (err: any) {
      console.error('Kitchen status update error:', err);
      throw err;
    }
  };

  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  return (
    <div className="max-w-7xl w-full mx-auto py-5 sm:py-6 px-4 sm:px-6 space-y-6">
      {/* Top Bar / Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onNavigateOrders}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Order Management</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Audio Chime Notification Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
            }`}
            title={soundEnabled ? 'Kitchen alerts sound enabled' : 'Kitchen alerts sound muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-700" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Alerts On' : 'Alerts Muted'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchKitchenOrders(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 shadow-2xs transition-colors"
            title="Refresh kitchen orders"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* High-Contrast Kitchen Header Banner */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-stone-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-400/30 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{restaurant?.name || 'Kitchen'} • Live KDS Station</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Kitchen Display System</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                FIFO Queue
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 font-medium">
              Orders accepted by staff requiring kitchen preparation sorted by oldest arrival first. Touch ticket buttons to advance status.
            </p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto bg-stone-800/80 border border-stone-700/80 px-4 py-3 rounded-2xl">
            <div className="text-right">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
                Kitchen Time
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">
                {currentTime}
              </span>
            </div>
            <div className="h-8 w-px bg-stone-700" />
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
                Active Tickets
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-white">
                {totalActive}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Station Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilterStation('all')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shadow-xs ${
            filterStation === 'all'
              ? 'bg-stone-900 text-white'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          <span>All Kitchen Tickets</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              filterStation === 'all' ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-800'
            }`}
          >
            {totalActive}
          </span>
        </button>

        <button
          onClick={() => setFilterStation('accepted')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shadow-xs ${
            filterStation === 'accepted'
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-indigo-200/80 text-indigo-900 hover:bg-indigo-50/50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Accepted / In Queue</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              filterStation === 'accepted' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-900'
            }`}
          >
            {acceptedCount || pendingCount}
          </span>
        </button>

        <button
          onClick={() => setFilterStation('preparing')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shadow-xs ${
            filterStation === 'preparing'
              ? 'bg-sky-600 text-white'
              : 'bg-white border border-sky-200/80 text-sky-900 hover:bg-sky-50/50'
          }`}
        >
          <ChefHat className="w-3.5 h-3.5" />
          <span>Cooking / In Prep</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              filterStation === 'preparing' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-900'
            }`}
          >
            {preparingCount}
          </span>
        </button>

        <button
          onClick={() => setFilterStation('ready')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shadow-xs ${
            filterStation === 'ready'
              ? 'bg-emerald-600 text-white'
              : 'bg-white border border-emerald-200/80 text-emerald-900 hover:bg-emerald-50/50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Ready to Expedite</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              filterStation === 'ready' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900'
            }`}
          >
            {readyCount}
          </span>
        </button>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => fetchKitchenOrders(true)}
            className="text-xs font-bold underline hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-16 text-center shadow-xs">
          <Loader2 className="w-10 h-10 text-amber-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-stone-800">Connecting to Kitchen Line...</p>
          <p className="text-xs text-stone-500 mt-1">Retrieving active food preparation tickets.</p>
        </div>
      ) : orders.length === 0 ? (
        /* Empty Kitchen Board */
        <div className="bg-white border border-stone-200 rounded-3xl p-16 text-center shadow-xs space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <ChefHat className="w-10 h-10" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-xl font-black text-stone-900">
              {filterStation !== 'all' ? `No tickets in "${filterStation}" stage` : 'Kitchen is All Caught Up!'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 font-medium">
              {filterStation !== 'all'
                ? 'Check other station tabs or wait for new table orders to arrive.'
                : 'No pending or cooking tickets at this moment. The kitchen display automatically refreshes as customers order.'}
            </p>
          </div>
          {filterStation !== 'all' && (
            <button
              onClick={() => setFilterStation('all')}
              className="px-4 py-2 rounded-xl bg-stone-900 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              View All Stations
            </button>
          )}
        </div>
      ) : (
        /* Kitchen Tickets Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              onUpdateStatus={handleUpdateStatus}
              onViewDetails={handleOpenDetails}
            />
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={handleCloseDetails}
        onStatusUpdate={handleUpdateStatus}
      />
    </div>
  );
};
