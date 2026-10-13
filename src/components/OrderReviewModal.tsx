import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  Store,
  MapPin,
  Clock,
  User,
  MessageSquare,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { CartItem } from '../types';
import { calculateOrderPrepTime } from '../utils/prepTime';

interface OrderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToCart: () => void;
  cart: CartItem[];
  tableNumber: string;
  tableDisplayLabel?: string;
  restaurantName: string;
  onSubmitOrder: (customerName: string, customerNote: string) => Promise<boolean>;
  isSubmitting: boolean;
  submissionError: string | null;
}

export const OrderReviewModal: React.FC<OrderReviewModalProps> = ({
  isOpen,
  onClose,
  onBackToCart,
  cart,
  tableNumber,
  tableDisplayLabel,
  restaurantName,
  onSubmitOrder,
  isSubmitting,
  submissionError,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerNote, setCustomerNote] = useState('');

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const orderPrepTime = calculateOrderPrepTime(
    cart.map((i) => ({
      min_prep_time: i.min_prep_time || 20,
      max_prep_time: i.max_prep_time || 30,
      batch_quantity: i.batch_quantity || 4,
      quantity: i.quantity,
    }))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    await onSubmitOrder(customerName.trim(), customerNote.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToCart}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-600 flex items-center justify-center transition-colors disabled:opacity-50"
              title="Back to cart"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-stone-900">Review & Confirm Order</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-500 flex items-center justify-center transition-colors disabled:opacity-50"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Table Destination Confirmation */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Order Destination
              </span>
              <div className="text-base font-extrabold text-stone-950 mt-0.5">
                {tableNumber}
                {tableDisplayLabel && (
                  <span className="text-xs font-medium text-stone-600 ml-1.5">
                    ({tableDisplayLabel})
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                {restaurantName}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
          </div>

          {/* Estimated Preparation Time Notice */}
          <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-stone-800 uppercase tracking-wider block">
                  Estimated Preparation
                </span>
                <span className="text-[11px] text-stone-500">
                  Timer starts upon placing order
                </span>
              </div>
            </div>
            <span className="text-sm sm:text-base font-black text-stone-900 font-mono">
              {orderPrepTime.minTime}–{orderPrepTime.maxTime} min
            </span>
          </div>

          {/* Error Banner */}
          {submissionError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-bold block">Could not place order:</span>
                <span>{submissionError}</span>
              </div>
            </div>
          )}

          {/* Itemized Order Summary */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Items Ordered ({cart.length})
            </h3>
            <div className="bg-stone-50 border border-stone-200/90 rounded-2xl divide-y divide-stone-200/70 overflow-hidden">
              {cart.map((item) => {
                const lineTotal = item.price * item.quantity;
                return (
                  <div
                    key={item.food_item_id}
                    className="p-3 sm:px-4 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-stone-200 text-stone-800 text-[11px] font-extrabold flex items-center justify-center shrink-0">
                          {item.quantity}×
                        </span>
                        <span className="font-bold text-stone-900 truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-400 pl-7">
                        Rs {item.price.toFixed(2)} each
                      </span>
                    </div>
                    <span className="font-extrabold text-stone-900 shrink-0">
                      Rs {lineTotal.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subtotal Calculation */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center text-stone-600">
              <span>Items Total</span>
              <span className="font-semibold text-stone-900">Rs {subtotal.toFixed(2)}</span>
            </div>
            <div className="border-t border-stone-100 pt-2 flex justify-between items-center text-sm font-extrabold text-stone-950">
              <span>Total to Pay upon Dining</span>
              <span className="text-base text-amber-700 font-black">
                Rs {subtotal.toFixed(2)}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 pt-1">
              * Payment is settled directly with your server or restaurant counter after dining.
            </p>
          </div>

          {/* Optional Customer Information */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Customer Details (Optional)
            </h3>

            {/* Customer Name */}
            <div>
              <label
                htmlFor="customerNameInput"
                className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-stone-400" />
                <span>Your Name (optional)</span>
              </label>
              <input
                id="customerNameInput"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                maxLength={100}
                placeholder="e.g., Sarah or Table 4 Guest"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 text-xs sm:text-sm text-stone-900 bg-white"
              />
            </div>

            {/* Order Note */}
            <div>
              <label
                htmlFor="customerNoteInput"
                className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                <span>Special Instructions or Allergy Notes (optional)</span>
              </label>
              <textarea
                id="customerNoteInput"
                rows={2}
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                maxLength={500}
                placeholder="e.g., dressing on the side, extra napkins, allergy to nuts"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 text-xs sm:text-sm text-stone-900 bg-white resize-none"
              />
            </div>
          </div>

          {/* Footer Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || cart.length === 0}
              className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl text-sm sm:text-base shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting Order to Restaurant...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Place Order (Rs {subtotal.toFixed(2)})</span>
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-stone-400 mt-2">
              By placing the order, your request will be delivered directly to the restaurant staff.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
