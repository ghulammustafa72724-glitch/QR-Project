import React, { useState } from 'react';
import { Plus, Utensils, Check, Clock } from 'lucide-react';
import { FoodItem } from '../types';

interface CustomerFoodCardProps {
  item: FoodItem;
  quantityInCart: number;
  onOpenDetails: (item: FoodItem) => void;
  onQuickAdd: (item: FoodItem, e: React.MouseEvent) => void;
}

export const CustomerFoodCard: React.FC<CustomerFoodCardProps> = ({
  item,
  quantityInCart,
  onOpenDetails,
  onQuickAdd,
}) => {
  const [imgError, setImgError] = useState(false);
  const isAvailable = item.is_available === 1;

  const minPrep = item.min_prep_time || 15;
  const maxPrep = item.max_prep_time || 25;
  const prepText = minPrep === maxPrep ? `${minPrep} minutes` : `${minPrep}–${maxPrep} minutes`;

  return (
    <div
      onClick={() => isAvailable && onOpenDetails(item)}
      className={`group relative bg-white border rounded-2xl p-3.5 sm:p-4 transition-all flex flex-col justify-between select-none ${
        isAvailable
          ? 'border-stone-200/90 hover:border-amber-400/80 hover:shadow-md cursor-pointer'
          : 'border-stone-200 bg-stone-50/70 opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="flex gap-3 sm:gap-4 items-start">
        {/* Thumbnail Image / Fallback */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-stone-100 border border-stone-200/60 shrink-0 overflow-hidden relative">
          {item.image_url && !imgError ? (
            <img
              src={item.image_url}
              alt={item.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-stone-300">
              <Utensils className="w-6 h-6 stroke-[1.5]" />
            </div>
          )}

          {/* In-Cart Badge on Image */}
          {quantityInCart > 0 && (
            <span className="absolute top-1 left-1 bg-amber-600 text-white text-[11px] font-extrabold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
              {quantityInCart}
            </span>
          )}

          {!isAvailable && (
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px] flex items-center justify-center p-1 text-center">
              <span className="text-[10px] font-bold text-white bg-stone-800/90 px-1.5 py-0.5 rounded">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Content Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h3 className="text-sm sm:text-base font-bold text-stone-900 leading-snug group-hover:text-amber-800 transition-colors">
              {item.name}
            </h3>
          </div>

          {item.description && (
            <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Preparation Time Display */}
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium mt-1.5">
            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
            <span>Estimated preparation: <strong className="text-stone-700 font-semibold">{prepText}</strong></span>
          </div>

          {/* Price & Action Row */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-sm sm:text-base font-extrabold text-stone-900 tracking-tight">
              Rs {Number(item.price).toFixed(2)}
            </span>

            {isAvailable ? (
              <button
                type="button"
                onClick={(e) => onQuickAdd(item, e)}
                className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  quantityInCart > 0
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-stone-900 hover:bg-stone-800 text-white'
                }`}
                title="Add to order"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">{quantityInCart > 0 ? 'Add more' : 'Add'}</span>
                {quantityInCart > 0 && <span className="sm:hidden font-extrabold">({quantityInCart})</span>}
              </button>
            ) : (
              <span className="text-xs font-semibold text-stone-400">
                Unavailable
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
