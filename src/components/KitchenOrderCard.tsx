import React, { useState, useEffect } from 'react';
import {
  Clock,
  User,
  MessageSquare,
  Check,
  ChefHat,
  CheckCircle2,
  CheckCheck,
  Loader2,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { OrderStatusBadge } from './OrderStatusBadge';

interface KitchenOrderCardProps {
  order: Order;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  onViewDetails: (order: Order) => void;
}

export const KitchenOrderCard: React.FC<KitchenOrderCardProps> = ({
  order,
  onUpdateStatus,
  onViewDetails,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Calculate elapsed minutes since order creation
  useEffect(() => {
    const calculateElapsed = () => {
      const createdTime = new Date(order.created_at).getTime();
      const now = Date.now();
      const diffMinutes = Math.max(0, Math.floor((now - createdTime) / 60000));
      setElapsedMinutes(diffMinutes);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 30000); // Re-calculate every 30s
    return () => clearInterval(interval);
  }, [order.created_at]);

  const toggleItemCheck = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleAdvanceStatus = async () => {
    try {
      setIsUpdating(true);
      if (order.status === 'accepted' || order.status === 'pending') {
        await onUpdateStatus(order.id, 'preparing');
      } else if (order.status === 'preparing') {
        await onUpdateStatus(order.id, 'ready');
      } else if (order.status === 'ready') {
        await onUpdateStatus(order.id, 'completed');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Determine urgency tier for kitchen ticket
  const getUrgency = () => {
    if (elapsedMinutes >= 20) {
      return {
        label: `${elapsedMinutes}m ago`,
        bg: 'bg-rose-100 text-rose-800 border-rose-300',
        pulse: true,
      };
    }
    if (elapsedMinutes >= 10) {
      return {
        label: `${elapsedMinutes}m ago`,
        bg: 'bg-amber-100 text-amber-800 border-amber-300',
        pulse: false,
      };
    }
    return {
      label: `${elapsedMinutes}m ago`,
      bg: 'bg-stone-100 text-stone-700 border-stone-200',
      pulse: false,
    };
  };

  const urgency = getUrgency();

  // Status specific border highlights
  const cardBorderClass = {
    pending: 'border-amber-300 bg-amber-50/20 shadow-xs ring-1 ring-amber-200/50',
    accepted: 'border-indigo-300 bg-indigo-50/20 shadow-xs ring-1 ring-indigo-200/50',
    preparing: 'border-sky-300 bg-sky-50/20 shadow-xs ring-1 ring-sky-200/50',
    ready: 'border-emerald-300 bg-emerald-50/20 shadow-xs ring-1 ring-emerald-200/50',
    completed: 'border-stone-200 bg-white opacity-70',
    served: 'border-stone-200 bg-white opacity-70',
    cancelled: 'border-rose-200 bg-white opacity-70',
    rejected: 'border-rose-200 bg-white opacity-70',
  }[order.status] || 'border-stone-200 bg-white';

  const totalItemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <div
      className={`rounded-3xl border bg-white flex flex-col justify-between overflow-hidden transition-all duration-150 ${cardBorderClass}`}
    >
      {/* Ticket Header */}
      <div className="p-4 border-b border-stone-200 bg-stone-50/70 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-black tracking-tight text-stone-900 uppercase">
              {order.table_number_snapshot || order.table_number || 'TABLE'}
            </span>
            {order.table_display_label && (
              <span className="text-[11px] font-semibold text-stone-500 bg-white px-2 py-0.5 rounded-md border border-stone-200 truncate max-w-[120px]">
                {order.table_display_label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="font-mono font-semibold text-stone-700">#{order.order_number}</span>
            {order.customer_name && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-stone-600 truncate max-w-[130px]">
                  <User className="w-3 h-3 text-stone-400 shrink-0" />
                  {order.customer_name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Elapsed Timer Badge */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${urgency.bg}`}
          >
            {urgency.pulse && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            )}
            <Clock className="w-3 h-3" />
            <span>{urgency.label}</span>
          </div>
          <span className="text-[10px] text-stone-500 font-medium">
            Target: {order.estimated_prep_min || 20}–{order.estimated_prep_max || 30}m
          </span>
          <OrderStatusBadge status={order.status} size="sm" />
        </div>
      </div>

      {/* Ticket Body */}
      <div className="p-4 space-y-3.5 flex-1">
        {/* Urgent Customer Note Banner */}
        {order.customer_note && (
          <div className="p-3 rounded-2xl bg-amber-100/90 border border-amber-300 text-amber-950 flex items-start gap-2.5 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-extrabold block text-amber-900 uppercase text-[10px] tracking-wider mb-0.5">
                Kitchen Note:
              </span>
              <p className="font-semibold whitespace-pre-wrap leading-relaxed">
                {order.customer_note}
              </p>
            </div>
          </div>
        )}

        {/* Itemized Kitchen Prep List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-500 px-0.5">
            <span>Items to prepare ({totalItemCount})</span>
            <span className="text-[10px] font-medium text-stone-400">Click to cross out</span>
          </div>

          <div className="space-y-1.5">
            {order.items?.map((item, idx) => {
              const itemKey = item.id || `${item.food_item_id}-${idx}`;
              const isChecked = !!checkedItems[itemKey];

              return (
                <button
                  key={itemKey}
                  type="button"
                  onClick={() => toggleItemCheck(itemKey)}
                  className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                    isChecked
                      ? 'bg-stone-50 border-stone-200/60 opacity-50 text-stone-400 line-through'
                      : 'bg-white border-stone-200/90 hover:border-amber-300 text-stone-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 border ${
                        isChecked
                          ? 'bg-stone-100 text-stone-400 border-stone-200'
                          : 'bg-stone-900 text-white border-stone-900'
                      }`}
                    >
                      {item.quantity}
                    </span>
                    <span
                      className={`text-sm font-semibold truncate ${
                        isChecked ? 'line-through text-stone-400' : 'text-stone-900'
                      }`}
                    >
                      {item.food_name || item.food_name_snapshot || 'Item'}
                    </span>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      isChecked
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-stone-300 bg-stone-50'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ticket Footer Actions */}
      <div className="p-4 border-t border-stone-200 bg-stone-50/60 flex items-center gap-2">
        <button
          onClick={() => onViewDetails(order)}
          className="p-2.5 rounded-xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 transition-colors shrink-0"
          title="View full receipt details"
        >
          <Eye className="w-4 h-4" />
        </button>

        {(order.status === 'accepted' || order.status === 'pending') && (
          <button
            onClick={handleAdvanceStatus}
            disabled={isUpdating}
            className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChefHat className="w-4 h-4" />
            )}
            <span>Start Preparing</span>
          </button>
        )}

        {order.status === 'preparing' && (
          <button
            onClick={handleAdvanceStatus}
            disabled={isUpdating}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Mark Ready to Serve</span>
          </button>
        )}

        {order.status === 'ready' && (
          <button
            onClick={handleAdvanceStatus}
            disabled={isUpdating}
            className="flex-1 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            <span>Complete / Served</span>
          </button>
        )}
      </div>
    </div>
  );
};
