import React, { useState } from 'react';
import { Store, MapPin, Phone, Info, ChevronDown, ChevronUp, Utensils } from 'lucide-react';

interface CustomerMenuHeaderProps {
  restaurant: {
    id: string;
    name: string;
    description?: string;
    address?: string;
    phone?: string;
    logo_url?: string;
  };
  table: {
    id: string;
    table_number: string;
    display_label?: string;
  };
}

export const CustomerMenuHeader: React.FC<CustomerMenuHeaderProps> = ({ restaurant, table }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-2xs">
      {/* Top Banner Bar */}
      <div className="max-w-4xl mx-auto px-4 py-3 sm:py-3.5 flex items-center justify-between gap-3">
        {/* Restaurant Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0 overflow-hidden border border-amber-600/20">
            {restaurant.logo_url && !logoError ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                onError={() => setLogoError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <Utensils className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-stone-900 truncate tracking-tight">
                {restaurant.name}
              </h1>
            </div>
            <p className="text-xs text-stone-500 truncate flex items-center gap-1.5 font-medium">
              <span>Digital Dine-In Menu</span>
              {restaurant.description && (
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-amber-700 hover:text-amber-800 underline decoration-dotted inline-flex items-center gap-0.5 ml-1"
                >
                  <span>Info</span>
                  {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </p>
          </div>
        </div>

        {/* Table Badge */}
        <div className="shrink-0 flex flex-col items-end">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold">{table.table_number}</span>
          </div>
          {table.display_label && (
            <span className="text-[10px] text-stone-400 font-medium mt-0.5 max-w-[110px] truncate text-right">
              {table.display_label}
            </span>
          )}
        </div>
      </div>

      {/* Expandable Restaurant Info Tray */}
      {showDetails && (
        <div className="bg-stone-50 border-t border-stone-100 px-4 py-3 text-xs text-stone-600 transition-all">
          <div className="max-w-4xl mx-auto space-y-1.5">
            {restaurant.description && (
              <p className="text-stone-700 leading-relaxed font-normal">
                {restaurant.description}
              </p>
            )}
            <div className="flex flex-wrap gap-4 pt-1 text-stone-500 font-medium">
              {restaurant.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{restaurant.address}</span>
                </div>
              )}
              {restaurant.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{restaurant.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
