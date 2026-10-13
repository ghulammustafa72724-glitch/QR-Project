import React from 'react';
import { Category } from '../types';

interface CategoryChipsProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  totalItemsCount: number;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  totalItemsCount,
}) => {
  return (
    <div className="sticky top-[57px] sm:top-[61px] z-20 bg-stone-50/95 backdrop-blur-md border-b border-stone-200/80 py-2.5 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
          {/* All Items Chip */}
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategoryId === null
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300 hover:text-stone-900'
            }`}
          >
            <span>All Items</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedCategoryId === null
                  ? 'bg-stone-800 text-stone-300'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              {totalItemsCount}
            </span>
          </button>

          {/* Category Chips */}
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300 hover:text-stone-900'
                }`}
              >
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
