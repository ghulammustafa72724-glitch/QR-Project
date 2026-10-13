import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Layers,
  DollarSign,
  Image as ImageIcon,
  FolderPlus,
  Search,
  Filter,
  X,
  Loader2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Category, FoodItem } from '../types';

export const MenuView: React.FC = () => {
  const { token, restaurant } = useAuth();

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Loading & Alert states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryActive, setCategoryActive] = useState(true);

  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [foodName, setFoodName] = useState('');
  const [foodCategoryId, setFoodCategoryId] = useState('');
  const [foodPrice, setFoodPrice] = useState('');
  const [foodDescription, setFoodDescription] = useState('');
  const [foodImageUrl, setFoodImageUrl] = useState('');
  const [foodAvailable, setFoodAvailable] = useState(true);
  const [foodOrder, setFoodOrder] = useState('1');
  const [foodMinPrepTime, setFoodMinPrepTime] = useState('20');
  const [foodMaxPrepTime, setFoodMaxPrepTime] = useState('30');
  const [foodBatchQuantity, setFoodBatchQuantity] = useState('4');

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'food';
    id: string;
    name: string;
    foodCount?: number;
  } | null>(null);

  // Quick Preset Food Images for convenience
  const sampleImages = [
    { label: 'Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80' },
    { label: 'Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80' },
    { label: 'Pasta', url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&auto=format&fit=crop&q=80' },
    { label: 'Salad', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80' },
    { label: 'Dessert', url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&auto=format&fit=crop&q=80' },
    { label: 'Drink', url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&auto=format&fit=crop&q=80' },
  ];

  // Fetch all menu data
  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [catsRes, foodsRes] = await Promise.all([
        fetch('/api/categories', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/food-items', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (catsRes.ok && foodsRes.ok) {
        const catsData = await catsRes.json();
        const foodsData = await foodsRes.json();
        setCategories(catsData.categories || []);
        setFoodItems(foodsData.foodItems || []);
      } else {
        setErrorMessage('Unable to load menu data. Please refresh.');
      }
    } catch (err) {
      console.error('Error loading menu:', err);
      setErrorMessage('Failed to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // ==========================================
  // CATEGORY ACTIONS
  // ==========================================
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
    setCategoryActive(true);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDescription(cat.description || '');
    setCategoryActive(cat.is_active === 1);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setErrorMessage('Category name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: categoryName.trim(),
          description: categoryDescription.trim(),
          is_active: categoryActive ? 1 : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to save category.');
      } else {
        showSuccess(editingCategory ? 'Category updated successfully.' : 'Category created successfully.');
        setIsCategoryModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setErrorMessage('Error connecting to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCats = [...categories];
    const temp = newCats[index];
    newCats[index] = newCats[targetIndex];
    newCats[targetIndex] = temp;

    // Build batch payload
    const orders = newCats.map((cat, idx) => ({ id: cat.id, display_order: idx + 1 }));
    setCategories(newCats);

    try {
      await fetch('/api/categories/reorder/batch', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orders }),
      });
    } catch (err) {
      fetchData(); // Rollback on error
    }
  };

  // ==========================================
  // FOOD ITEM ACTIONS
  // ==========================================
  const handleOpenAddFood = (defaultCatId?: string) => {
    if (categories.length === 0) {
      setErrorMessage('Please create at least one category before adding food items.');
      return;
    }
    setEditingFood(null);
    setFoodName('');
    setFoodCategoryId(defaultCatId && defaultCatId !== 'all' ? defaultCatId : categories[0].id);
    setFoodPrice('');
    setFoodDescription('');
    setFoodImageUrl('');
    setFoodAvailable(true);
    setFoodOrder('1');
    setFoodMinPrepTime('20');
    setFoodMaxPrepTime('30');
    setFoodBatchQuantity('4');
    setIsFoodModalOpen(true);
  };

  const handleOpenEditFood = (food: FoodItem) => {
    setEditingFood(food);
    setFoodName(food.name);
    setFoodCategoryId(food.category_id);
    setFoodPrice(food.price.toFixed(2));
    setFoodDescription(food.description || '');
    setFoodImageUrl(food.image_url || '');
    setFoodAvailable(food.is_available === 1);
    setFoodOrder(String(food.display_order || 1));
    setFoodMinPrepTime(String(food.min_prep_time || 20));
    setFoodMaxPrepTime(String(food.max_prep_time || 30));
    setFoodBatchQuantity(String(food.batch_quantity || 4));
    setIsFoodModalOpen(true);
  };

  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) {
      setErrorMessage('Food name is required.');
      return;
    }
    if (!foodCategoryId) {
      setErrorMessage('Please select a category for this food item.');
      return;
    }
    const numPrice = parseFloat(foodPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      setErrorMessage('Please enter a valid non-negative price.');
      return;
    }

    const minPrep = parseInt(foodMinPrepTime, 10);
    const maxPrep = parseInt(foodMaxPrepTime, 10);
    const batchQty = parseInt(foodBatchQuantity, 10);

    if (isNaN(minPrep) || minPrep < 1 || minPrep > 240) {
      setErrorMessage('Minimum preparation time must be between 1 and 240 minutes.');
      return;
    }
    if (isNaN(maxPrep) || maxPrep < 1 || maxPrep > 240) {
      setErrorMessage('Maximum preparation time must be between 1 and 240 minutes.');
      return;
    }
    if (maxPrep < minPrep) {
      setErrorMessage('Maximum preparation time cannot be less than minimum preparation time.');
      return;
    }
    if (isNaN(batchQty) || batchQty < 1 || batchQty > 100) {
      setErrorMessage('Batch quantity must be a whole number between 1 and 100.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const url = editingFood ? `/api/food-items/${editingFood.id}` : '/api/food-items';
      const method = editingFood ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: foodName.trim(),
          category_id: foodCategoryId,
          price: numPrice,
          description: foodDescription.trim(),
          image_url: foodImageUrl.trim(),
          is_available: foodAvailable ? 1 : 0,
          display_order: parseInt(foodOrder, 10) || 1,
          min_prep_time: minPrep,
          max_prep_time: maxPrep,
          batch_quantity: batchQty,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to save food item.');
      } else {
        showSuccess(editingFood ? 'Food item updated successfully.' : 'Food item created successfully.');
        setIsFoodModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setErrorMessage('Error connecting to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAvailability = async (food: FoodItem) => {
    const newStatus = food.is_available === 1 ? 0 : 1;
    // Optimistic UI update
    setFoodItems((prev) =>
      prev.map((item) => (item.id === food.id ? { ...item, is_available: newStatus } : item))
    );

    try {
      const res = await fetch(`/api/food-items/${food.id}/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_available: newStatus }),
      });

      if (!res.ok) {
        fetchData(); // Rollback
        setErrorMessage('Failed to update availability.');
      } else {
        showSuccess(`"${food.name}" marked as ${newStatus ? 'Available' : 'Unavailable'}.`);
      }
    } catch (err) {
      fetchData();
    }
  };

  // ==========================================
  // SAFE DELETION HANDLER
  // ==========================================
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (deleteTarget.type === 'category') {
        const res = await fetch(`/api/categories/${deleteTarget.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMessage(data.error || 'Failed to delete category.');
        } else {
          showSuccess('Category deleted successfully.');
          if (selectedCategoryId === deleteTarget.id) {
            setSelectedCategoryId('all');
          }
          fetchData();
        }
      } else if (deleteTarget.type === 'food') {
        const res = await fetch(`/api/food-items/${deleteTarget.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMessage(data.error || 'Failed to delete food item.');
        } else {
          showSuccess('Food item deleted successfully.');
          fetchData();
        }
      }
    } catch (err) {
      setErrorMessage('Error connecting to server.');
    } finally {
      setIsSubmitting(false);
      setDeleteTarget(null);
    }
  };

  // Filtering food items by category & search query
  const filteredFoodItems = foodItems.filter((item) => {
    const matchesCategory = selectedCategoryId === 'all' || item.category_id === selectedCategoryId;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const availableCount = foodItems.filter((f) => f.is_available === 1).length;

  return (
    <div className="max-w-6xl w-full mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/50">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Menu Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-500">
            Create and manage the food and categories displayed by your restaurant.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenAddCategory}
            className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs sm:text-sm shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4 text-stone-500" />
            <span>Add Category</span>
          </button>

          <button
            onClick={() => handleOpenAddFood(selectedCategoryId)}
            disabled={categories.length === 0}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Food Item</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="font-medium flex-1">{successMessage}</p>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <p className="font-medium flex-1">{errorMessage}</p>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-3.5 sm:p-4">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Categories
          </span>
          <span className="text-xl sm:text-2xl font-bold text-stone-900 mt-0.5 block">
            {categories.length}
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-3.5 sm:p-4">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Total Dishes
          </span>
          <span className="text-xl sm:text-2xl font-bold text-stone-900 mt-0.5 block">
            {foodItems.length}
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-3.5 sm:p-4">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Available
          </span>
          <span className="text-xl sm:text-2xl font-bold text-emerald-600 mt-0.5 block">
            {availableCount}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-16 text-center bg-white border border-stone-200 rounded-2xl">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-stone-600">Loading restaurant menu...</p>
        </div>
      ) : categories.length === 0 ? (
        /* Empty State: No Categories */
        <div className="bg-white border border-dashed border-stone-300 rounded-2xl p-8 sm:p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 border border-amber-200/60 rounded-2xl mx-auto flex items-center justify-center">
            <FolderPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900">No categories yet</h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Create your first menu category (e.g. Starters, Main Course, Drinks, Desserts) to begin organizing food items.
            </p>
          </div>
          <button
            onClick={handleOpenAddCategory}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Category</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Category Tabs & Reordering Header */}
          <div className="bg-white border border-stone-200 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Menu Categories
              </span>
              <span className="text-xs text-stone-400">
                {categories.length} total • Use arrows to reorder
              </span>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => setSelectedCategoryId('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  selectedCategoryId === 'all'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <span>All Dishes</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                  {foodItems.length}
                </span>
              </button>

              {categories.map((cat, idx) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <div
                    key={cat.id}
                    className={`group inline-flex items-center rounded-xl pl-3 pr-1.5 py-1 text-xs font-semibold transition-all border ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className="flex items-center gap-1.5 mr-2 text-left focus:outline-hidden"
                    >
                      <span>{cat.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? 'bg-white/25 text-white' : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {cat.food_count || 0}
                      </span>
                    </button>

                    {/* Quick Category Action buttons */}
                    <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                      {idx > 0 && (
                        <button
                          onClick={() => handleMoveCategory(idx, 'up')}
                          title="Move Left"
                          className="p-1 hover:bg-black/10 rounded"
                        >
                          <MoveUp className="w-3 h-3 rotate-270" />
                        </button>
                      )}
                      {idx < categories.length - 1 && (
                        <button
                          onClick={() => handleMoveCategory(idx, 'down')}
                          title="Move Right"
                          className="p-1 hover:bg-black/10 rounded"
                        >
                          <MoveDown className="w-3 h-3 rotate-270" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditCategory(cat)}
                        title="Edit Category"
                        className="p-1 hover:bg-black/10 rounded"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            type: 'category',
                            id: cat.id,
                            name: cat.name,
                            foodCount: cat.food_count || 0,
                          })
                        }
                        title="Delete Category"
                        className="p-1 hover:bg-rose-500/20 text-rose-600 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search & Food Items Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search food by name or description..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="text-xs text-stone-500 flex items-center gap-1.5 self-end sm:self-auto">
                <span>Showing {filteredFoodItems.length} dish{filteredFoodItems.length !== 1 ? 'es' : ''}</span>
              </div>
            </div>

            {/* Food Items Grid */}
            {filteredFoodItems.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-stone-700">
                  {searchQuery
                    ? 'No dishes matching your search query.'
                    : 'No food items in this category yet.'}
                </p>
                <p className="text-xs text-stone-400">
                  Add delicious food items with prices, photos, and descriptions.
                </p>
                <button
                  onClick={() => handleOpenAddFood(selectedCategoryId)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Food Item</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFoodItems.map((food) => {
                  const isAvailable = food.is_available === 1;
                  return (
                    <div
                      key={food.id}
                      className={`bg-white border rounded-2xl overflow-hidden transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${
                        isAvailable ? 'border-stone-200' : 'border-stone-200 opacity-75 bg-stone-50/50'
                      }`}
                    >
                      {/* Top: Image and badges */}
                      <div className="relative aspect-video bg-stone-100 overflow-hidden">
                        {food.image_url ? (
                          <img
                            src={food.image_url}
                            alt={food.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback on broken image link
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-50">
                            <UtensilsCrossed className="w-8 h-8 opacity-40 mb-1" />
                            <span className="text-[11px] font-medium">No photo set</span>
                          </div>
                        )}

                        {/* Price Badge */}
                        <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-stone-900/90 text-white backdrop-blur-xs text-xs font-bold shadow-xs">
                          Rs {food.price.toFixed(2)}
                        </div>

                        {/* Category Tag */}
                        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-white/95 text-stone-800 text-[10px] font-semibold shadow-2xs backdrop-blur-xs">
                          {food.category_name}
                        </div>
                      </div>

                      {/* Middle: Name & Description */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="text-sm font-bold text-stone-900 leading-snug line-clamp-1">
                              {food.name}
                            </h3>
                          </div>
                          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                            {food.description || 'No description provided.'}
                          </p>

                          {/* Preparation Time & Batch Badge */}
                          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-amber-900 bg-amber-50/90 border border-amber-200/60 px-2 py-0.5 rounded-md w-fit">
                            <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>
                              {food.min_prep_time || 20}–{food.max_prep_time || 30} mins • Batch of {food.batch_quantity || 4}
                            </span>
                          </div>
                        </div>

                        {/* Availability toggle */}
                        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
                          <button
                            onClick={() => handleToggleAvailability(food)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                              isAvailable
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isAvailable ? 'bg-emerald-500' : 'bg-stone-400'
                              }`}
                            />
                            <span>{isAvailable ? 'Available' : 'Out of Stock'}</span>
                          </button>

                          {/* Edit & Delete Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditFood(food)}
                              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                              title="Edit item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'food',
                                  id: food.id,
                                  name: food.name,
                                })
                              }
                              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 1: ADD / EDIT CATEGORY */}
      {/* ========================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h2 className="text-base font-bold text-stone-900">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h2>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="cat-name">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="cat-name"
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Starters, Wood-Fired Pizza, Beverages"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="cat-desc">
                  Description (Optional)
                </label>
                <textarea
                  id="cat-desc"
                  rows={2}
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="Brief note about dishes in this category..."
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-stone-700">Category Active</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categoryActive}
                    onChange={(e) => setCategoryActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingCategory ? 'Update Category' : 'Create Category'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: ADD / EDIT FOOD ITEM */}
      {/* ========================================== */}
      {isFoodModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-6 shadow-xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h2 className="text-base font-bold text-stone-900">
                {editingFood ? 'Edit Food Item' : 'Add Food Item'}
              </h2>
              <button
                onClick={() => setIsFoodModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFood} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="food-name">
                  Food Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="food-name"
                  type="text"
                  required
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="e.g. Truffle Cheeseburger"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="food-cat">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="food-cat"
                    required
                    value={foodCategoryId}
                    onChange={(e) => setFoodCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="food-price">
                    Price (Rs) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 text-xs font-bold">Rs</span>
                    <input
                      id="food-price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={foodPrice}
                      onChange={(e) => setFoodPrice(e.target.value)}
                      placeholder="450.00"
                      className="w-full pl-10 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="food-desc">
                  Description
                </label>
                <textarea
                  id="food-desc"
                  rows={2}
                  value={foodDescription}
                  onChange={(e) => setFoodDescription(e.target.value)}
                  placeholder="Ingredients, preparation details, allergen warnings..."
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              {/* Image URL & Quick Sample Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-700" htmlFor="food-img">
                    Photo URL (Optional)
                  </label>
                  <span className="text-[11px] text-stone-400">Direct image link</span>
                </div>
                <input
                  id="food-img"
                  type="url"
                  value={foodImageUrl}
                  onChange={(e) => setFoodImageUrl(e.target.value)}
                  placeholder="https://example.com/dish.jpg"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />

                {/* Sample quick preset images for easy testing */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-stone-400 font-medium mr-1">Presets:</span>
                  {sampleImages.map((samp, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFoodImageUrl(samp.url)}
                      className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200"
                    >
                      {samp.label}
                    </button>
                  ))}
                  {foodImageUrl && (
                    <button
                      type="button"
                      onClick={() => setFoodImageUrl('')}
                      className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Preparation Time & Batch Quantity Settings */}
              <div className="p-3.5 bg-stone-50 border border-stone-200/90 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Preparation Settings</span>
                  </div>
                  <span className="text-[11px] text-stone-400">Calculates customer wait time</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Minimum prep time */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1" htmlFor="food-min-prep">
                      Min Time (mins) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="food-min-prep"
                      type="number"
                      min="1"
                      max="240"
                      required
                      value={foodMinPrepTime}
                      onChange={(e) => setFoodMinPrepTime(e.target.value)}
                      placeholder="20"
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-medium"
                    />
                  </div>

                  {/* Maximum prep time */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1" htmlFor="food-max-prep">
                      Max Time (mins) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="food-max-prep"
                      type="number"
                      min="1"
                      max="240"
                      required
                      value={foodMaxPrepTime}
                      onChange={(e) => setFoodMaxPrepTime(e.target.value)}
                      placeholder="30"
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-medium"
                    />
                  </div>

                  {/* Batch Quantity */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1" htmlFor="food-batch-qty">
                      Batch Quantity <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="food-batch-qty"
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={foodBatchQuantity}
                      onChange={(e) => setFoodBatchQuantity(e.target.value)}
                      placeholder="4"
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-medium"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-stone-500 leading-normal">
                  Normally takes <span className="font-semibold text-stone-700">{foodMinPrepTime || 20}–{foodMaxPrepTime || 30} mins</span> to prepare up to <span className="font-semibold text-stone-700">{foodBatchQuantity || 4} units</span> in one batch.
                </p>
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-semibold text-stone-700 block">Available for Ordering</span>
                  <span className="text-[11px] text-stone-400">Toggle off when ingredients run out</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={foodAvailable}
                    onChange={(e) => setFoodAvailable(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFoodModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingFood ? 'Save Changes' : 'Add Food Item'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 3: CONFIRM DELETE (SAFE DELETION) */}
      {/* ========================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h2 className="text-base font-bold text-stone-900">
                Delete {deleteTarget.type === 'category' ? 'Category' : 'Food Item'}?
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                Are you sure you want to delete <span className="font-semibold text-stone-900">"{deleteTarget.name}"</span>?
              </p>

              {deleteTarget.type === 'category' && (deleteTarget.foodCount || 0) > 0 && (
                <div className="mt-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <p className="font-semibold">Safe Deletion Notice:</p>
                  <p className="mt-0.5">
                    This category contains {deleteTarget.foodCount} food item(s). In order to protect your menu data, the server will prevent deletion until you move or delete these items first.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
