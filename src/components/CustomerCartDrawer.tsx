import React from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  UtensilsCrossed,
  Clock,
} from 'lucide-react';
import { CartItem } from '../types';
import { calculateItemPrepTime, calculateOrderPrepTime } from '../utils/prepTime';

interface CustomerCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  tableNumber: string;
  restaurantName: string;
  onUpdateQuantity: (foodItemId: string, newQuantity: number) => void;
  onRemoveItem: (foodItemId: string) => void;
  onClearCart: () => void;
  onProceedToReview: () => void;
}

export const CustomerCartDrawer: React.FC<CustomerCartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  tableNumber,
  restaurantName,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToReview,
}) => {
  if (!isOpen) return null;

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Calculate order-wide preparation time based on simultaneous preparation rule
  const orderPrepTime = calculateOrderPrepTime(
    cart.map((i) => ({
      min_prep_time: i.min_prep_time || 20,
      max_prep_time: i.max_prep_time || 30,
      batch_quantity: i.batch_quantity || 4,
      quantity: i.quantity,
    }))
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cart Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Your Order Cart</h2>
              <p className="text-xs text-stone-500">
                {restaurantName} • <span className="font-semibold text-stone-700">{tableNumber}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-500 flex items-center justify-center transition-colors"
            title="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center">
                <UtensilsCrossed className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-800">Your cart is empty</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-[220px]">
                  Explore the menu categories and add delicious dishes to your order.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-all"
              >
                Browse Digital Menu
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 text-xs text-stone-500">
                <span>{totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in order</span>
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 text-[11px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear all</span>
                </button>
              </div>

              {cart.map((item) => {
                const lineTotal = item.price * item.quantity;
                const itemPrep = calculateItemPrepTime(
                  item.min_prep_time || 20,
                  item.max_prep_time || 30,
                  item.batch_quantity || 4,
                  item.quantity
                );
                return (
                  <div
                    key={item.food_item_id}
                    className="p-3 bg-stone-50/80 border border-stone-200/90 rounded-2xl flex items-center justify-between gap-3"
                  >
                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-stone-900 truncate">
                        {item.name}
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Rs {item.price.toFixed(2)} each
                      </p>
                      {/* Live Prep Time for Item */}
                      <div className="flex items-center gap-1 text-[11px] text-stone-500 font-medium mt-1">
                        <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>
                          Estimated: <strong className="text-stone-700 font-semibold">{itemPrep.minTime}–{itemPrep.maxTime} minutes</strong>
                        </span>
                      </div>
                      <p className="text-xs font-extrabold text-stone-800 mt-1">
                        Total: Rs {lineTotal.toFixed(2)}
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-white border border-stone-200 rounded-xl p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity > 1) {
                              onUpdateQuantity(item.food_item_id, item.quantity - 1);
                            } else {
                              onRemoveItem(item.food_item_id);
                            }
                          }}
                          className="w-7 h-7 rounded-lg text-stone-600 hover:bg-stone-100 flex items-center justify-center transition-colors"
                          title="Decrease or remove"
                        >
                          {item.quantity === 1 ? (
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          ) : (
                            <Minus className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <span className="w-7 text-center text-xs font-bold text-stone-900">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.food_item_id, item.quantity + 1)}
                          disabled={item.quantity >= 99}
                          className="w-7 h-7 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 flex items-center justify-center transition-colors"
                          title="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 space-y-3 shrink-0">
            {/* Live Order Estimated Preparation Time */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                    Estimated Preparation
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Calculated for order quantity
                  </span>
                </div>
              </div>
              <span className="text-sm sm:text-base font-extrabold text-stone-900 font-mono">
                {orderPrepTime.minTime}–{orderPrepTime.maxTime} min
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between items-center">
                <span>Items Subtotal</span>
                <span className="font-bold text-stone-900 text-sm">
                  Rs {subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-stone-400">
                <span>Dine-In Table Order</span>
                <span>{tableNumber}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onProceedToReview}
              className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-sm shadow-md transition-all flex items-center justify-between gap-2"
            >
              <span>Review & Place Order</span>
              <span className="flex items-center gap-1.5 bg-amber-700/60 px-2.5 py-1 rounded-xl text-xs">
                <span>Rs {subtotal.toFixed(2)}</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
