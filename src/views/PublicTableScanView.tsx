import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2,
  AlertCircle,
  Home,
  ShoppingBag,
  ArrowRight,
  UtensilsCrossed,
  Clock,
  Sparkles,
  Search,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { FoodItem, Category, CartItem, Order, PublicCustomerMenuData, ServiceRequest } from '../types';
import { CustomerMenuHeader } from '../components/CustomerMenuHeader';
import { CategoryChips } from '../components/CategoryChips';
import { CustomerFoodCard } from '../components/CustomerFoodCard';
import { FoodDetailModal } from '../components/FoodDetailModal';
import { CustomerCartDrawer } from '../components/CustomerCartDrawer';
import { OrderReviewModal } from '../components/OrderReviewModal';
import { OrderConfirmationView } from '../components/OrderConfirmationView';
import { CustomerServiceModal } from '../components/CustomerServiceModal';
import { LivePrepTimer } from '../components/LivePrepTimer';
import { useRealtime, useRealtimeSubscription } from '../context/RealtimeContext';

interface PublicTableScanViewProps {
  restaurantId: string;
  tableId: string;
  onNavigateHome: () => void;
}

export const PublicTableScanView: React.FC<PublicTableScanViewProps> = ({
  restaurantId,
  tableId,
  onNavigateHome,
}) => {
  // Data states
  const [menuData, setMenuData] = useState<PublicCustomerMenuData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Cart state with session persistence per restaurant & table
  const cartStorageKey = useMemo(() => `cart_${restaurantId}_${tableId}`, [restaurantId, tableId]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = sessionStorage.getItem(`cart_${restaurantId}_${tableId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  });

  // UI state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailItem, setDetailItem] = useState<FoodItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [activeTableOrder, setActiveTableOrder] = useState<Order | null>(null);

  // Load any active orders for this table on load (ensures live timer continues when leaving & returning)
  useEffect(() => {
    const fetchActiveOrders = async () => {
      try {
        const res = await fetch(`/api/public/r/${restaurantId}/t/${tableId}/orders/active`);
        const data = await res.json();
        if (res.ok && data.orders && data.orders.length > 0) {
          const latestActive = data.orders[0];
          setActiveTableOrder(latestActive);
        } else {
          setActiveTableOrder(null);
        }
      } catch {
        // Fallback to locally stored order if offline
        try {
          const saved = sessionStorage.getItem(`active_order_${restaurantId}_${tableId}`) ||
                        localStorage.getItem(`active_order_${restaurantId}_${tableId}`);
          if (saved) {
            setActiveTableOrder(JSON.parse(saved));
          }
        } catch {}
      }
    };
    fetchActiveOrders();
  }, [restaurantId, tableId]);

  // Part 7: Table Service Request & Realtime State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null);
  const { setCustomerContext } = useRealtime();

  // Register customer context for secure table-isolated real-time updates
  useEffect(() => {
    if (menuData?.table?.qr_code_token) {
      setCustomerContext({
        restaurantId,
        tableId,
        token: menuData.table.qr_code_token,
      });
    }
    return () => {
      setCustomerContext(null);
    };
  }, [menuData?.table?.qr_code_token, restaurantId, tableId, setCustomerContext]);

  // Load any existing active service request for this table on load
  useEffect(() => {
    const fetchActiveRequests = async () => {
      try {
        const res = await fetch(`/api/public/r/${restaurantId}/t/${tableId}/service-requests/active`);
        const data = await res.json();
        if (res.ok && data.requests && data.requests.length > 0) {
          setActiveRequest(data.requests[0]);
        }
      } catch {
        // Ignore
      }
    };
    fetchActiveRequests();
  }, [restaurantId, tableId]);

  // Real-time: Service request created for this table
  useRealtimeSubscription('service_request.created', (data) => {
    if (data.requestId) {
      setActiveRequest({
        id: data.requestId,
        restaurant_id: restaurantId,
        table_id: tableId,
        table_number_snapshot: menuData?.table?.table_number || '',
        request_type: data.requestType,
        status: data.status,
        created_at: data.createdAt,
      });
    }
  });

  // Real-time: Service request updated (Acknowledged or Resolved)
  useRealtimeSubscription('service_request.updated', (data) => {
    if (data.requestId) {
      if (data.status === 'resolved') {
        setActiveRequest((prev) => (prev ? { ...prev, status: 'resolved' } : null));
        setTimeout(() => setActiveRequest(null), 8000);
      } else {
        setActiveRequest((prev) =>
          prev ? { ...prev, status: data.status, acknowledged_by_name: data.acknowledgedByName } : null
        );
      }
    }
  });

  // Real-time: Order status changed for the placed order
  useRealtimeSubscription('order.status_changed', (data) => {
    const changedId = data.orderId || data.order?.id;
    const newStatus = data.newStatus || data.order?.status;
    if (submittedOrder && (submittedOrder.id === changedId)) {
      setSubmittedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    if (activeTableOrder && (activeTableOrder.id === changedId)) {
      setActiveTableOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  });

  // Save cart to sessionStorage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } catch {
      // Ignore storage errors
    }
  }, [cart, cartStorageKey]);

  // Fetch restaurant menu and table context
  const loadMenu = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const res = await fetch(`/api/public/r/${restaurantId}/t/${tableId}`);
      const data = await res.json();

      if (!res.ok) {
        setFetchError(data.error || 'The requested restaurant or table could not be found.');
      } else {
        setMenuData(data);
      }
    } catch (err) {
      console.error('Customer menu load error:', err);
      setFetchError('Unable to connect to the restaurant service. Please check your network.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, tableId]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  // Cart calculations
  const totalCartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );
  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  // Cart quantity lookup map: food_item_id -> quantity
  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart) {
      map[item.food_item_id] = item.quantity;
    }
    return map;
  }, [cart]);

  // Cart Handlers
  const handleAddToCart = (foodItem: FoodItem, quantity: number) => {
    if (foodItem.is_available !== 1) return;

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((i) => i.food_item_id === foodItem.id);
      if (existingIdx >= 0) {
        const updated = [...prevCart];
        const newQty = Math.min(updated[existingIdx].quantity + quantity, 99);
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            food_item_id: foodItem.id,
            name: foodItem.name,
            price: Number(foodItem.price),
            quantity: Math.min(Math.max(quantity, 1), 99),
            image_url: foodItem.image_url,
            category_name: foodItem.category_name,
            min_prep_time: foodItem.min_prep_time || 20,
            max_prep_time: foodItem.max_prep_time || 30,
            batch_quantity: foodItem.batch_quantity || 4,
          },
        ];
      }
    });
  };

  const handleQuickAdd = (foodItem: FoodItem, e: React.MouseEvent) => {
    e.stopPropagation();
    handleAddToCart(foodItem, 1);
  };

  const handleUpdateQuantity = (foodItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(foodItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.food_item_id === foodItemId
          ? { ...item, quantity: Math.min(newQuantity, 99) }
          : item
      )
    );
  };

  const handleRemoveItem = (foodItemId: string) => {
    setCart((prev) => prev.filter((item) => item.food_item_id !== foodItemId));
  };

  const handleClearCart = () => {
    setCart([]);
    try {
      sessionStorage.removeItem(cartStorageKey);
    } catch {
      // Ignore
    }
  };

  // Submit Order to backend
  const handleSubmitOrder = async (customerName: string, customerNote: string): Promise<boolean> => {
    if (isSubmitting || cart.length === 0) return false;

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const payload = {
        customer_name: customerName,
        customer_note: customerNote,
        items: cart.map((item) => ({
          food_item_id: item.food_item_id,
          quantity: item.quantity,
        })),
      };

      const res = await fetch(`/api/public/r/${restaurantId}/t/${tableId}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        setSubmissionError(result.error || 'Failed to place order. Please review your cart.');
        return false;
      }

      // Order created successfully!
      setSubmittedOrder(result.order);
      setActiveTableOrder(result.order);
      try {
        sessionStorage.setItem(`active_order_${restaurantId}_${tableId}`, JSON.stringify(result.order));
        localStorage.setItem(`active_order_${restaurantId}_${tableId}`, JSON.stringify(result.order));
      } catch {
        // ignore
      }
      handleClearCart();
      setIsReviewOpen(false);
      setIsCartOpen(false);
      return true;
    } catch (err) {
      console.error('Order submission error:', err);
      setSubmissionError('Network error while placing order. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset to menu from confirmation
  const handleBackToMenu = () => {
    setSubmittedOrder(null);
    setSubmissionError(null);
    loadMenu();
  };

  // Filter food items based on category and optional search term
  const filteredFoodItems = useMemo(() => {
    if (!menuData || !menuData.food_items) return [];

    let items = menuData.food_items;

    // Filter by selected category
    if (selectedCategoryId) {
      items = items.filter((item) => item.category_id === selectedCategoryId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query)) ||
          (item.category_name && item.category_name.toLowerCase().includes(query))
      );
    }

    return items;
  }, [menuData, selectedCategoryId, searchQuery]);

  // Group food items by category when showing "All Items" and no search query
  const groupedCategories = useMemo(() => {
    if (!menuData || selectedCategoryId !== null || searchQuery.trim() !== '') return null;

    const groups: { category: Category; items: FoodItem[] }[] = [];
    const categoryMap = new Map<string, Category>();

    for (const cat of menuData.categories) {
      categoryMap.set(cat.id, cat);
    }

    for (const cat of menuData.categories) {
      const catItems = menuData.food_items.filter((item) => item.category_id === cat.id);
      if (catItems.length > 0) {
        groups.push({
          category: cat,
          items: catItems,
        });
      }
    }

    return groups;
  }, [menuData, selectedCategoryId, searchQuery]);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-stone-700">Loading digital menu...</p>
        <p className="text-xs text-stone-400 mt-1">Verifying table identity & restaurant catalog</p>
      </div>
    );
  }

  // 2. Error State (Table / Restaurant not found)
  if (fetchError || !menuData) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-xs space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 border border-rose-200 rounded-2xl mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900">Table Not Found</h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1.5 leading-relaxed">
              {fetchError || 'This QR destination does not exist or has been removed.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateHome}
            className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Main System</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Inactive Table State
  if (menuData.status === 'inactive' || menuData.table.is_active === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-xs space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 mx-auto flex items-center justify-center">
            <Clock className="w-7 h-7" />
          </div>

          <div>
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
              {menuData.restaurant.name}
            </span>
            <h1 className="text-2xl font-extrabold text-stone-950 mt-1">
              {menuData.table.table_number}
            </h1>
            {menuData.table.display_label && (
              <p className="text-xs text-stone-500 font-medium">{menuData.table.display_label}</p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs text-left space-y-1 leading-relaxed">
            <p className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              This table is currently unavailable.
            </p>
            <p className="text-stone-600 pl-5">
              The restaurant staff has marked this table as temporarily closed or inactive. Digital ordering is disabled for this table. Please speak to your server or host.
            </p>
          </div>

          <button
            type="button"
            onClick={onNavigateHome}
            className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Main System</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Order Confirmation State (When an order was just placed in this flow)
  if (submittedOrder) {
    return (
      <OrderConfirmationView
        order={submittedOrder}
        onBackToMenu={handleBackToMenu}
        onNavigateHome={onNavigateHome}
      />
    );
  }

  // 5. Active Customer Digital Menu Experience
  return (
    <div className="min-h-screen bg-stone-50/60 pb-28 font-sans antialiased text-stone-900">
      {/* Real-Time Live Preparation Timer Banner for Active Table Order */}
      {activeTableOrder && ['pending', 'preparing', 'ready'].includes(activeTableOrder.status) && (
        <div className="sticky top-0 z-40 shadow-xs">
          <LivePrepTimer
            createdAt={activeTableOrder.created_at}
            estimatedMin={activeTableOrder.estimated_prep_min || 20}
            estimatedMax={activeTableOrder.estimated_prep_max || 30}
            orderStatus={activeTableOrder.status}
            orderNumber={activeTableOrder.order_number}
            variant="banner"
            onViewDetails={() => setSubmittedOrder(activeTableOrder)}
          />
        </div>
      )}

      {/* Customer Header */}
      <CustomerMenuHeader restaurant={menuData.restaurant} table={menuData.table} />

      {/* Part 7: Active Service Request Status Banner */}
      {activeRequest && (
        <div className="max-w-4xl mx-auto px-4 pt-3">
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs shadow-xs transition-all ${
              activeRequest.status === 'acknowledged'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : activeRequest.status === 'resolved'
                ? 'bg-sky-50 border-sky-300 text-sky-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Bell
                className={`w-4 h-4 shrink-0 ${
                  activeRequest.status === 'pending'
                    ? 'animate-bounce text-amber-600'
                    : 'text-emerald-600'
                }`}
              />
              <div>
                <span className="font-bold block">
                  {activeRequest.status === 'acknowledged'
                    ? '✓ Waiter Acknowledged: Staff is on the way to your table!'
                    : activeRequest.status === 'resolved'
                    ? '✓ Request Completed: Hope you enjoy your meal!'
                    : '🛎️ Waiter Notified: Your request has been sent to our staff.'}
                </span>
                <span className="text-[11px] opacity-80">
                  Request: {activeRequest.request_type.replace('_', ' ')}
                  {activeRequest.acknowledged_by_name ? ` • Handled by ${activeRequest.acknowledged_by_name}` : ''}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsServiceModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-[11px] font-bold text-stone-700 border border-stone-200 shadow-2xs"
            >
              Call Again
            </button>
          </div>
        </div>
      )}

      {/* Category Horizontal Navigation Chips */}
      {menuData.categories.length > 0 && (
        <CategoryChips
          categories={menuData.categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          totalItemsCount={menuData.food_items.length}
        />
      )}

      {/* Search and Filter Sub-bar */}
      <div className="max-w-4xl mx-auto px-4 pt-3 pb-1">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu dishes..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white border border-stone-200/80 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-800 placeholder:text-stone-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-400 hover:text-stone-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Menu Content Area */}
      <main className="max-w-4xl mx-auto px-4 py-4 space-y-6">
        {/* If Restaurant Has Zero Food Items */}
        {menuData.food_items.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-3xl p-8 sm:p-12 text-center max-w-md mx-auto space-y-3 mt-6">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <UtensilsCrossed className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h2 className="text-base font-bold text-stone-800">Menu is currently unavailable</h2>
            <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
              The restaurant has not listed any active items yet. Please consult with the restaurant staff.
            </p>
          </div>
        ) : filteredFoodItems.length === 0 ? (
          /* Filtered search found 0 items */
          <div className="bg-white border border-stone-200 rounded-3xl p-8 text-center max-w-md mx-auto space-y-3 mt-6">
            <p className="text-sm font-semibold text-stone-800">No dishes match your search</p>
            <p className="text-xs text-stone-400">
              Try a different keyword or reset the category filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryId(null);
              }}
              className="py-2 px-4 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200"
            >
              Show All Dishes
            </button>
          </div>
        ) : groupedCategories && groupedCategories.length > 0 ? (
          /* Grouped by categories view */
          groupedCategories.map(({ category, items }) => (
            <section key={category.id} className="space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                <div>
                  <h2 className="text-base font-extrabold text-stone-900 tracking-tight">
                    {category.name}
                  </h2>
                  {category.description && (
                    <p className="text-xs text-stone-500">{category.description}</p>
                  )}
                </div>
                <span className="text-xs font-medium text-stone-400">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {items.map((item) => (
                  <CustomerFoodCard
                    key={item.id}
                    item={item}
                    quantityInCart={cartQuantities[item.id] || 0}
                    onOpenDetails={(it) => setDetailItem(it)}
                    onQuickAdd={handleQuickAdd}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          /* Flat list for single selected category or search results */
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
              <h2 className="text-base font-extrabold text-stone-900 tracking-tight">
                {selectedCategoryId
                  ? menuData.categories.find((c) => c.id === selectedCategoryId)?.name || 'Dishes'
                  : 'Search Results'}
              </h2>
              <span className="text-xs font-medium text-stone-400">
                {filteredFoodItems.length} {filteredFoodItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {filteredFoodItems.map((item) => (
                <CustomerFoodCard
                  key={item.id}
                  item={item}
                  quantityInCart={cartQuantities[item.id] || 0}
                  onOpenDetails={(it) => setDetailItem(it)}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating / Sticky Bottom Order Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-xl transition-all animate-in slide-in-from-bottom duration-200">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            {/* Cart Preview summary */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-3 text-left min-w-0 hover:opacity-80 transition-opacity"
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-extrabold text-stone-900">
                    {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'}
                  </span>
                  <span className="text-stone-300">•</span>
                  <span className="text-sm font-extrabold text-amber-700">
                    Rs {cartSubtotal.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 truncate">
                  Ordering for <strong className="text-stone-800">{menuData.table.table_number}</strong>
                </p>
              </div>
            </button>

            {/* Action to Review Order */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="hidden sm:inline-flex py-3 px-4 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors"
              >
                View Cart
              </button>

              <button
                type="button"
                onClick={() => setIsReviewOpen(true)}
                className="py-3 px-5 sm:px-6 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0"
              >
                <span>Review Order</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Food Detail Modal */}
      <FoodDetailModal
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onAddToCart={handleAddToCart}
        initialQuantity={detailItem ? cartQuantities[detailItem.id] || 1 : 1}
      />

      {/* Cart Sliding Drawer */}
      <CustomerCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        tableNumber={menuData.table.table_number}
        restaurantName={menuData.restaurant.name}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onProceedToReview={() => {
          setIsCartOpen(false);
          setIsReviewOpen(true);
        }}
      />

      {/* Order Review & Placement Modal */}
      <OrderReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onBackToCart={() => {
          setIsReviewOpen(false);
          setIsCartOpen(true);
        }}
        cart={cart}
        tableNumber={menuData.table.table_number}
        tableDisplayLabel={menuData.table.display_label}
        restaurantName={menuData.restaurant.name}
        onSubmitOrder={handleSubmitOrder}
        isSubmitting={isSubmitting}
        submissionError={submissionError}
      />

      {/* Part 7: Floating "Need Help / Call Waiter" Button */}
      <button
        type="button"
        onClick={() => setIsServiceModalOpen(true)}
        className="fixed bottom-6 left-4 z-40 px-3.5 py-2.5 bg-stone-950 text-white rounded-full text-xs font-bold shadow-lg hover:bg-stone-800 transition-all active:scale-95 flex items-center gap-2 border border-stone-800"
      >
        <Bell className="w-4 h-4 text-amber-400" />
        <span>Need Help?</span>
      </button>

      {/* Part 7: Customer Service Request Modal */}
      <CustomerServiceModal
        restaurantId={restaurantId}
        tableId={tableId}
        tableNumber={menuData.table.table_number}
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        onSuccess={(req) => {
          setActiveRequest(req);
        }}
      />
    </div>
  );
};
