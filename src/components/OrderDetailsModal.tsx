import React, { useState } from 'react';
import {
  X,
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
  Printer,
  ArrowRight,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { OrderStatusBadge } from './OrderStatusBadge';
import { LivePrepTimer } from './LivePrepTimer';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus) => Promise<void>;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  onStatusUpdate,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  if (!isOpen || !order) return null;

  const formattedDate = new Date(order.created_at).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    try {
      setIsUpdating(true);
      setErrorMessage(null);
      await onStatusUpdate(order.id, newStatus);
      setShowCancelConfirm(false);
      setShowRejectConfirm(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update order status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Determine available next step in the standard workflow
  const getNextAction = () => {
    switch (order.status) {
      case 'pending':
        return {
          status: 'accepted' as OrderStatus,
          label: 'Accept & Send to Kitchen',
          icon: CheckCircle2,
          color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        };
      case 'accepted':
        return {
          status: 'preparing' as OrderStatus,
          label: 'Start Preparing',
          icon: ChefHat,
          color: 'bg-sky-600 hover:bg-sky-700 text-white',
        };
      case 'preparing':
        return {
          status: 'ready' as OrderStatus,
          label: 'Mark as Ready to Serve',
          icon: CheckCircle2,
          color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        };
      case 'ready':
        return {
          status: 'completed' as OrderStatus,
          label: 'Mark as Completed / Served',
          icon: CheckCheck,
          color: 'bg-stone-900 hover:bg-stone-800 text-white',
        };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  // Lifecycle steps for the progression bar
  const steps: { key: OrderStatus; label: string }[] = [
    { key: 'pending', label: 'Received' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'ready', label: 'Ready' },
    { key: 'completed', label: 'Completed' },
  ];

  const getStepState = (stepKey: OrderStatus) => {
    if (order.status === 'cancelled' || order.status === 'rejected') return 'cancelled';
    const statusOrder: OrderStatus[] = ['pending', 'accepted', 'preparing', 'ready', 'completed'];
    const currentIndex = statusOrder.indexOf(order.status === 'served' ? 'completed' : order.status);
    const stepIndex = statusOrder.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-stone-900 tracking-tight font-mono">
                  #{order.order_number}
                </h2>
                <OrderStatusBadge status={order.status} size="sm" />
              </div>
              <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>{formattedDate}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-xl transition-colors"
              title="Print Order Ticket"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Status Progression Bar */}
          {order.status !== 'cancelled' && order.status !== 'rejected' ? (
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4">
              <div className="flex items-center justify-between relative">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-stone-200 -z-0" />

                {steps.map((step) => {
                  const state = getStepState(step.key);
                  return (
                    <div key={step.key} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          state === 'completed'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : state === 'current'
                            ? 'bg-amber-600 text-white ring-4 ring-amber-100 shadow-xs'
                            : 'bg-white border-2 border-stone-300 text-stone-400'
                        }`}
                      >
                        {state === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <span>{steps.indexOf(step) + 1}</span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-semibold mt-1.5 ${
                          state === 'current'
                            ? 'text-amber-800 font-bold'
                            : state === 'completed'
                            ? 'text-emerald-800'
                            : 'text-stone-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : order.status === 'rejected' ? (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>This order was rejected and was not sent to the kitchen display.</span>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>This order was cancelled and will not proceed through preparation.</span>
            </div>
          )}

          {/* Real-Time Preparation Timer Card */}
          {order.status !== 'cancelled' && order.status !== 'rejected' && (
            <LivePrepTimer
              createdAt={order.created_at}
              estimatedMin={order.estimated_prep_min || 20}
              estimatedMax={order.estimated_prep_max || 30}
              orderStatus={order.status}
              orderNumber={order.order_number}
              variant="card"
            />
          )}

          {/* Table & Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                Dining Location
              </span>
              <p className="text-base font-extrabold text-stone-900">
                {order.table_number_snapshot || order.table_number || 'Table'}
              </p>
              {order.table_display_label && (
                <p className="text-xs text-stone-600 mt-0.5 font-medium">
                  {order.table_display_label}
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                Customer Info
              </span>
              <div className="flex items-center gap-1.5 text-sm font-bold text-stone-900">
                <User className="w-4 h-4 text-stone-400" />
                <span>{order.customer_name || 'Walk-in Customer'}</span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Table Identification Verified
              </p>
            </div>
          </div>

          {/* Customer Note Callout (High visibility) */}
          {order.customer_note && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
              <MessageSquare className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-amber-900 block mb-0.5">
                  Special Kitchen Note:
                </span>
                <p className="text-xs text-amber-900/90 whitespace-pre-wrap font-medium">
                  &ldquo;{order.customer_note}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Ordered Food Items List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Ordered Items ({order.items?.length || 0})
              </h3>
              <span className="text-xs text-stone-500 font-medium">
                {order.items?.reduce((sum, item) => sum + item.quantity, 0)} total food portions
              </span>
            </div>

            <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100">
              {order.items?.map((item, idx) => (
                <div key={item.id || idx} className="p-3.5 flex items-center justify-between hover:bg-stone-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-stone-100 border border-stone-200/70 text-stone-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {item.quantity}x
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-stone-900">
                        {item.food_name || item.food_name_snapshot || 'Food Item'}
                      </h4>
                      <p className="text-xs text-stone-500">
                        Rs {(item.unit_price ?? item.unit_price_snapshot ?? 0).toFixed(2)} each
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-stone-900 font-mono">
                    Rs {item.line_total.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Subtotal & Total Receipt Summary */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
            <div className="flex justify-between text-xs text-stone-600">
              <span>Subtotal</span>
              <span className="font-medium font-mono">Rs {order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-stone-600">
              <span>Taxes & Service</span>
              <span className="font-medium font-mono">Rs 0.00</span>
            </div>
            <div className="pt-2 border-t border-stone-200 flex justify-between text-base font-extrabold text-stone-900">
              <span>Total Amount</span>
              <span className="text-amber-800 font-mono">Rs {order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Rejection Confirmation Box */}
          {showRejectConfirm && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Confirm Order Rejection</span>
              </div>
              <p className="text-xs text-rose-800">
                Are you sure you want to reject Order #{order.order_number}? This order will be marked as rejected and <strong>will not be sent to the kitchen display</strong>.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleUpdateStatus('rejected')}
                  disabled={isUpdating}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                >
                  {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Yes, Reject Order</span>
                </button>
                <button
                  onClick={() => setShowRejectConfirm(false)}
                  disabled={isUpdating}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50 transition-colors"
                >
                  Keep Order
                </button>
              </div>
            </div>
          )}

          {/* Cancellation Confirmation Box */}
          {showCancelConfirm && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Confirm Order Cancellation</span>
              </div>
              <p className="text-xs text-rose-800">
                Are you sure you want to cancel Order #{order.order_number}? This order will be marked as cancelled and removed from active preparation queues.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleUpdateStatus('cancelled')}
                  disabled={isUpdating}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                >
                  {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Yes, Cancel Order</span>
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={isUpdating}
                  className="px-3 py-1.5 rounded-xl bg-white border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50 transition-colors"
                >
                  Keep Order
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {order.status === 'pending' && !showRejectConfirm && !showCancelConfirm && (
              <button
                onClick={() => {
                  setShowRejectConfirm(true);
                  setShowCancelConfirm(false);
                }}
                disabled={isUpdating}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-100/70 border border-rose-200/80 transition-colors flex items-center justify-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject Order</span>
              </button>
            )}

            {order.status !== 'pending' && order.status !== 'cancelled' && order.status !== 'rejected' && order.status !== 'completed' && !showCancelConfirm && !showRejectConfirm && (
              <button
                onClick={() => {
                  setShowCancelConfirm(true);
                  setShowRejectConfirm(false);
                }}
                disabled={isUpdating}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-100/70 border border-rose-200/80 transition-colors"
              >
                Cancel Order
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50 transition-colors"
            >
              Close
            </button>

            {nextAction && !showCancelConfirm && !showRejectConfirm && (
              <button
                onClick={() => handleUpdateStatus(nextAction.status)}
                disabled={isUpdating}
                className={`w-full sm:w-auto px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60 ${nextAction.color}`}
              >
                {isUpdating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <nextAction.icon className="w-3.5 h-3.5" />
                )}
                <span>{nextAction.label}</span>
                <ArrowRight className="w-3 h-3 ml-0.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
