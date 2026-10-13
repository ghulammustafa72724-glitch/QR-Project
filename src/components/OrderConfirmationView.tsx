import React from 'react';
import {
  CheckCircle2,
  Clock,
  Store,
  MapPin,
  UtensilsCrossed,
  ArrowRight,
  Home,
  MessageSquare,
  User,
  ShoppingBag,
} from 'lucide-react';
import { Order } from '../types';
import { OrderStatusBadge } from './OrderStatusBadge';
import { LivePrepTimer } from './LivePrepTimer';

interface OrderConfirmationViewProps {
  order: Order;
  onBackToMenu: () => void;
  onNavigateHome: () => void;
}

export const OrderConfirmationView: React.FC<OrderConfirmationViewProps> = ({
  order,
  onBackToMenu,
  onNavigateHome,
}) => {
  const formattedDate = new Date(order.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-stone-50 py-6 sm:py-10 px-4 sm:px-6">
      <div className="max-w-lg mx-auto space-y-6 animate-in fade-in duration-300">
        {/* Main Success Card */}
        <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm text-center space-y-6">
          {/* Animated Success Badge */}
          <div>
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
              <CheckCircle2 className="w-9 h-9 stroke-[2]" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Order Placed Successfully
            </span>

            <h1 className="text-2xl font-black text-stone-950 tracking-tight">
              Thank You!
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Your order has been transmitted directly to the staff at{' '}
              <span className="font-semibold text-stone-900">{order.restaurant_name}</span>.
            </p>
          </div>

          {/* Real-Time Live Preparation Timer */}
          <LivePrepTimer
            createdAt={order.created_at}
            estimatedMin={order.estimated_prep_min || 20}
            estimatedMax={order.estimated_prep_max || 30}
            orderStatus={order.status}
            orderNumber={order.order_number}
            variant="hero"
          />

          {/* Order Details Header Box */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-left flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Order Reference
              </span>
              <span className="text-lg font-mono font-black text-stone-950 tracking-wide">
                {order.order_number}
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Placed at {formattedDate}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Table
              </span>
              <span className="text-base font-extrabold text-stone-900 block">
                {order.table_number || order.table_number_snapshot}
              </span>
              <div className="mt-1">
                <OrderStatusBadge status={order.status} />
              </div>
            </div>
          </div>

          {/* Customer info if provided */}
          {(order.customer_name || order.customer_note) && (
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5 text-left text-xs space-y-2">
              {order.customer_name && (
                <div className="flex items-center gap-2 text-stone-700">
                  <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>
                    Guest Name: <strong className="text-stone-900">{order.customer_name}</strong>
                  </span>
                </div>
              )}
              {order.customer_note && (
                <div className="flex items-start gap-2 text-stone-600">
                  <MessageSquare className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                  <span className="italic leading-relaxed">
                    Note: "{order.customer_note}"
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Ordered Items Breakdown */}
          <div className="text-left space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Items Ordered
            </h3>
            <div className="bg-stone-50/80 border border-stone-200/80 rounded-2xl divide-y divide-stone-200/60 overflow-hidden">
              {order.items.map((item, idx) => {
                const name = item.food_name || item.food_name_snapshot;
                const unitPrice = item.unit_price || item.unit_price_snapshot || 0;
                return (
                  <div
                    key={item.id || idx}
                    className="p-3 sm:px-4 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-stone-200 text-stone-800 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {item.quantity}×
                        </span>
                        <span className="font-semibold text-stone-900 truncate">
                          {name}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-400 pl-7">
                        Rs {unitPrice.toFixed(2)} each
                      </span>
                    </div>
                    <span className="font-bold text-stone-900 shrink-0">
                      Rs {item.line_total.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total Row */}
          <div className="pt-2 border-t border-stone-100 flex justify-between items-center text-sm font-extrabold text-stone-900">
            <span>Order Total</span>
            <span className="text-xl text-stone-950 font-black">
              Rs {order.total.toFixed(2)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2.5">
            <button
              type="button"
              onClick={onBackToMenu}
              className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Order More Items for Table {order.table_number || order.table_number_snapshot}</span>
            </button>

            <button
              type="button"
              onClick={onNavigateHome}
              className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-2xl text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return to Main System</span>
            </button>
          </div>
        </div>

        {/* Footer Brand */}
        <div className="text-center text-xs text-stone-400 pb-4">
          <span>QR Restaurant Ordering System</span> • <span>Dine-In Customer Menu</span>
        </div>
      </div>
    </div>
  );
};
