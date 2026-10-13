import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Sparkles, ChefHat } from 'lucide-react';
import { calculateRemainingPrepTime } from '../utils/prepTime';

interface LivePrepTimerProps {
  createdAt: string | Date | number;
  estimatedMin?: number;
  estimatedMax?: number;
  orderStatus?: string;
  orderNumber?: string;
  variant?: 'hero' | 'banner' | 'card' | 'compact';
  showSeconds?: boolean;
  onViewDetails?: () => void;
}

export const LivePrepTimer: React.FC<LivePrepTimerProps> = ({
  createdAt,
  estimatedMin = 20,
  estimatedMax = 30,
  orderStatus = 'pending',
  orderNumber,
  variant = 'hero',
  showSeconds = true,
  onViewDetails,
}) => {
  const [now, setNow] = useState(Date.now());

  // Update timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const prepTime = calculateRemainingPrepTime(createdAt, estimatedMin, estimatedMax, now);
  const isCompleted = orderStatus === 'completed' || orderStatus === 'served';
  const isReady = orderStatus === 'ready';
  const isAccepted = orderStatus === 'accepted';
  const isPending = orderStatus === 'pending';
  const isRejected = orderStatus === 'rejected';

  const displayTime = showSeconds ? prepTime.displayTextWithSeconds : prepTime.displayText;
  const elapsedDisplay = showSeconds ? prepTime.formattedElapsed : `${prepTime.elapsedMinutes}m`;

  // Calculate elapsed progress percentage toward max time (capped at 100%)
  const safeMax = Math.max(1, estimatedMax);
  const progressPercent = Math.min(100, Math.max(0, Math.round((prepTime.elapsedMinutes / safeMax) * 100)));

  // 1. COMPACT VARIANT (for lists or small badges)
  if (variant === 'compact') {
    if (isRejected) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span>Rejected</span>
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Served</span>
        </span>
      );
    }
    if (isReady) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ready to Serve</span>
        </span>
      );
    }
    if (isPending) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 font-mono">
          <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
          <span>Pending: {displayTime}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200/80 font-mono">
        <Clock className="w-3.5 h-3.5 text-indigo-600 animate-spin" style={{ animationDuration: '4s' }} />
        <span>Remaining: {displayTime}</span>
      </span>
    );
  }

  // 2. BANNER VARIANT (Sticky header bar when customer browses menu while waiting)
  if (variant === 'banner') {
    return (
      <div className={`text-white shadow-md px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm ${
        isRejected ? 'bg-rose-600' : 'bg-linear-to-r from-amber-500 to-amber-600'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-base sm:text-lg">{isRejected ? '❌' : isReady ? '🎉' : '🍳'}</span>
          <div className="truncate">
            <span className="font-bold">
              {isRejected
                ? 'Order not accepted by restaurant'
                : isReady
                ? 'Your order is ready!'
                : isCompleted
                ? 'Order served'
                : isPending
                ? orderNumber
                  ? `Order #${orderNumber} placed • Awaiting staff review`
                  : 'Order placed • Awaiting staff review'
                : isAccepted
                ? orderNumber
                  ? `Order #${orderNumber} accepted • In kitchen queue`
                  : 'Order accepted • In kitchen queue'
                : orderNumber
                ? `Order #${orderNumber} is being prepared`
                : 'Your order is being prepared'}
            </span>
            {!isRejected && !isCompleted && !isReady && (
              <span className="opacity-90 ml-2 hidden sm:inline">
                • Remaining: <strong className="font-extrabold font-mono">{displayTime}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isRejected && (
            <span className="font-mono font-bold bg-amber-700/60 px-2.5 py-1 rounded-lg text-xs sm:hidden">
              {displayTime}
            </span>
          )}
          {onViewDetails && (
            <button
              type="button"
              onClick={onViewDetails}
              className="px-3 py-1 bg-white text-amber-800 hover:bg-amber-50 font-bold rounded-lg text-xs shadow-xs transition-colors"
            >
              View Order
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. CARD VARIANT (for kitchen & staff order cards)
  if (variant === 'card') {
    return (
      <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-stone-700 font-semibold">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Preparation Estimate</span>
          </div>
          <span className="font-mono text-stone-500 text-[11px]">
            {estimatedMin}–{estimatedMax} min target
          </span>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-stone-500 text-[11px] font-mono">
            Elapsed: <strong className="text-stone-800 font-semibold">{elapsedDisplay}</strong>
          </span>
          <span className={`font-bold font-mono ${prepTime.isReadyTimeReached ? 'text-amber-700' : 'text-stone-900'}`}>
            {displayTime}
          </span>
        </div>

        <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              prepTime.isReadyTimeReached ? 'bg-amber-600' : 'bg-amber-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    );
  }

  // 4. HERO VARIANT (Primary Customer View on Order Confirmation / Tracking)
  return (
    <div className={`border-2 rounded-3xl p-5 sm:p-7 text-center shadow-sm space-y-4 animate-in fade-in duration-300 ${
      isRejected
        ? 'bg-rose-50/40 border-rose-200'
        : 'bg-linear-to-b from-amber-500/10 via-amber-500/5 to-white border-amber-500/30'
    }`}>
      {/* Title with icon */}
      <div className="flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl shadow-xs mb-2">
          {isRejected ? '❌' : isReady ? '🎉' : isCompleted ? '✨' : isPending ? '⏳' : isAccepted ? '👨‍🍳' : '🍳'}
        </div>

        {orderNumber && (
          <span className="text-xs font-mono font-bold text-amber-800 tracking-wider uppercase mb-1">
            Order #{orderNumber}
          </span>
        )}

        <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
          {isRejected
            ? 'Order Not Accepted'
            : isReady
            ? 'Your Order is Ready!'
            : isCompleted
            ? 'Order Served & Completed'
            : isPending
            ? 'Order Placed - Awaiting Confirmation'
            : isAccepted
            ? 'Order Accepted - Sent to Kitchen'
            : 'Your order is being prepared'}
        </h2>

        <p className="text-xs text-stone-500 mt-0.5">
          {isRejected
            ? 'Unfortunately, the restaurant was unable to accept this order. Please speak with staff.'
            : isReady
            ? 'Staff has finished preparing your meal and is delivering to your table.'
            : isCompleted
            ? 'Thank you for dining with us. Enjoy your meal!'
            : isPending
            ? 'Your order has been received by the staff and is awaiting review.'
            : isAccepted
            ? 'The restaurant has accepted your order and it has been sent to the kitchen.'
            : 'Our kitchen team is actively preparing your dishes.'}
        </p>
      </div>

      {/* Main Countdown Display Box (only when not rejected) */}
      {!isRejected && (
        <div className="bg-white border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">
            Estimated remaining
          </span>

          <div className="text-2xl sm:text-3xl font-black text-stone-950 font-mono tracking-tight flex items-center justify-center gap-2">
            {!isCompleted && !isReady && (
              <Clock className="w-6 h-6 text-amber-600 animate-spin" style={{ animationDuration: '8s' }} />
            )}
            <span>{displayTime}</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden mt-3 p-0.5 border border-stone-200/60">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                prepTime.isReadyTimeReached
                  ? 'bg-amber-600'
                  : 'bg-linear-to-r from-amber-500 to-amber-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
            <span>Target: {estimatedMin}–{estimatedMax} min</span>
            <span className="font-mono">Elapsed: {elapsedDisplay}</span>
          </div>
        </div>
      )}

      {/* Friendly Disclaimer as requested in user prompt */}
      {!isRejected && (
        <p className="text-[11px] text-stone-400 leading-normal max-w-xs mx-auto">
          Please note: preparation times are estimates and may vary slightly based on kitchen traffic.
        </p>
      )}
    </div>
  );
};
