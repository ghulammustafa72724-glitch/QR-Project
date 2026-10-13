import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Utensils, ShoppingBag, Clock } from 'lucide-react';
import { FoodItem } from '../types';
import { calculateItemPrepTime } from '../utils/prepTime';

interface FoodDetailModalProps {
  item: FoodItem | null;
  onClose: () => void;
  onAddToCart: (item: FoodItem, quantity: number) => void;
  initialQuantity?: number;
}

export const FoodDetailModal: React.FC<FoodDetailModalProps> = ({
  item,
  onClose,
  onAddToCart,
  initialQuantity = 1,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setQuantity(initialQuantity > 0 ? initialQuantity : 1);
    setImgError(false);
  }, [item, initialQuantity]);

  if (!item) return null;

  const isAvailable = item.is_available === 1;
  const unitPrice = Number(item.price);
  const calculatedTotal = (unitPrice * quantity).toFixed(2);

  // Calculate realistic preparation time based on quantity and batch capacity
  const prepEstimate = calculateItemPrepTime(
    item.min_prep_time || 20,
    item.max_prep_time || 30,
    item.batch_quantity || 4,
    quantity
  );

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < 99) {
      setQuantity((q) => q + 1);
    }
  };

  const handleConfirm = () => {
    if (!isAvailable) return;
    onAddToCart(item, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Modal / Bottom Sheet Box */}
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with image */}
        <div className="relative h-48 sm:h-56 bg-stone-100 shrink-0 overflow-hidden">
          {item.image_url && !imgError ? (
            <img
              src={item.image_url}
              alt={item.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 bg-stone-100">
              <Utensils className="w-12 h-12 stroke-[1.5]" />
              <span className="text-xs text-stone-400 mt-2 font-medium">No image provided</span>
            </div>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white flex items-center justify-center shadow-md transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {item.category_name && (
            <span className="absolute bottom-3 left-3 bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-2xs">
              {item.category_name}
            </span>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
                {item.name}
              </h2>
              <p className="text-base sm:text-lg font-extrabold text-stone-950 mt-1">
                Rs {unitPrice.toFixed(2)}
              </p>
            </div>

            {!isAvailable && (
              <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                Currently Out of Stock
              </span>
            )}
          </div>

          {item.description && (
            <p className="text-sm text-stone-600 leading-relaxed font-normal">
              {item.description}
            </p>
          )}

          {/* Live Estimated Preparation Time Box */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                  Estimated Preparation
                </span>
                <span className="text-xs text-stone-600">
                  {quantity} {quantity === 1 ? 'serving' : 'servings'}
                </span>
              </div>
            </div>
            <span className="text-sm sm:text-base font-extrabold text-stone-950">
              {prepEstimate.minTime}–{prepEstimate.maxTime} minutes
            </span>
          </div>

          {/* Quantity Controls */}
          {isAvailable && (
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-700">Quantity</span>

              <div className="flex items-center gap-3 bg-stone-100 rounded-xl p-1 border border-stone-200/80">
                <button
                  type="button"
                  onClick={handleDecrease}
                  disabled={quantity <= 1}
                  className="w-8 h-8 rounded-lg bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-2xs font-bold transition-all"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <span className="w-8 text-center text-sm font-extrabold text-stone-900">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={quantity >= 99}
                  className="w-8 h-8 rounded-lg bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-2xs font-bold transition-all"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 shrink-0">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isAvailable}
            className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-sm sm:text-base shadow-md transition-all flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>{isAvailable ? 'Add to Cart' : 'Item Unavailable'}</span>
            </span>
            {isAvailable && (
              <span className="font-extrabold text-white bg-amber-700/60 px-2.5 py-0.5 rounded-lg">
                Rs {calculatedTotal}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
