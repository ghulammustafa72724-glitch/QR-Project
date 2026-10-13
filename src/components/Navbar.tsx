import React, { useState } from 'react';
import {
  UtensilsCrossed,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Store,
  Menu as MenuIcon,
  X,
  LogIn,
  UserPlus,
  Home,
  QrCode,
  ClipboardList,
  ChefHat,
  Bell,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';

export type CurrentView =
  | 'home'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'profile'
  | 'menu'
  | 'tables'
  | 'orders'
  | 'kitchen'
  | 'waiter'
  | 'staff';

interface NavbarProps {
  currentView: CurrentView;
  onNavigate: (view: CurrentView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, restaurant, logout } = useAuth();
  const { status: realtimeStatus } = useRealtime();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (view: CurrentView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    sessionStorage.removeItem('currentView');
    onNavigate('login');
    setMobileMenuOpen(false);
  };

  const isOwner = user?.role === 'restaurant_owner';
  const isWaiter = user?.role === 'waiter';
  const isKitchen = user?.role === 'kitchen_staff';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between relative">
        {/* Brand */}
        <button
          onClick={() => handleNav(user ? (isWaiter ? 'waiter' : isKitchen ? 'kitchen' : 'dashboard') : 'home')}
          className="flex items-center gap-3 text-left focus:outline-hidden"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-stone-900 text-base tracking-tight block leading-tight">
              {restaurant?.name || 'QR Restaurant'}
            </span>
            <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
              {isOwner ? 'Owner Console' : isWaiter ? 'Waiter Station' : isKitchen ? 'Kitchen KDS' : 'Digital Dining'}
            </span>
          </div>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {/* Public Home Link & Marketing Section Navigation */}
          {!user && (
            <>
              <button
                onClick={() => handleNav('home')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                  currentView === 'home'
                    ? 'bg-stone-100 text-stone-900'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>

              <button
                onClick={() => {
                  if (currentView !== 'home') {
                    handleNav('home');
                    setTimeout(() => {
                      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  } else {
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                How It Works
              </button>

              <button
                onClick={() => {
                  if (currentView !== 'home') {
                    handleNav('home');
                    setTimeout(() => {
                      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  } else {
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Features
              </button>

              <button
                onClick={() => {
                  if (currentView !== 'home') {
                    handleNav('home');
                    setTimeout(() => {
                      document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  } else {
                    document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Product Preview
              </button>

              <button
                onClick={() => {
                  if (currentView !== 'home') {
                    handleNav('home');
                    setTimeout(() => {
                      document.getElementById('why-choose')?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  } else {
                    document.getElementById('why-choose')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Why Digital
              </button>
            </>
          )}

          {user ? (
            <>
              {/* Owner Navigation */}
              {isOwner && (
                <>
                  <button
                    onClick={() => handleNav('dashboard')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                      currentView === 'dashboard'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => handleNav('orders')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                      currentView === 'orders'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span>Orders</span>
                  </button>

                  <button
                    onClick={() => handleNav('menu')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                      currentView === 'menu'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>Menu</span>
                  </button>

                  <button
                    onClick={() => handleNav('tables')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
                      currentView === 'tables'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Tables & QR</span>
                  </button>

                  <button
                    onClick={() => handleNav('staff')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                      currentView === 'staff'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Staff</span>
                  </button>

                  <button
                    onClick={() => handleNav('profile')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                      currentView === 'profile'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                </>
              )}

              {/* Waiter Navigation */}
              {isWaiter && (
                <>
                  <button
                    onClick={() => handleNav('waiter')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                      currentView === 'waiter'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    <span>Waiter Station</span>
                  </button>

                  <button
                    onClick={() => handleNav('orders')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                      currentView === 'orders'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span>Orders</span>
                  </button>

                  <button
                    onClick={() => handleNav('tables')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                      currentView === 'tables'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Floor Tables</span>
                  </button>
                </>
              )}

              {/* Kitchen Staff Navigation */}
              {isKitchen && (
                <button
                  onClick={() => handleNav('kitchen')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                    currentView === 'kitchen'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  <ChefHat className="w-4 h-4" />
                  <span>Kitchen Display (KDS)</span>
                </button>
              )}

            </>
          ) : (
            <>
              <div className="h-4 w-px bg-stone-200 mx-1" />

              <button
                onClick={() => handleNav('login')}
                className="px-4 py-2 rounded-lg text-sm font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50 flex items-center gap-2 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </button>

              <button
                onClick={() => handleNav('register')}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-2 transition-colors shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </button>
            </>
          )}
        </nav>

        {/* Right Side: User Pill + Logout (desktop) */}
        {user && (
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-stone-50 border border-stone-200 rounded-full text-xs text-stone-700">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  isOwner
                    ? 'bg-amber-100 text-amber-800'
                    : isWaiter
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-orange-100 text-orange-800'
                }`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-[11px] leading-tight max-w-[100px] truncate">{user.name}</span>
                <span className="text-[9px] text-stone-500 leading-none capitalize">
                  {isOwner ? 'Owner' : isWaiter ? 'Waiter' : 'Kitchen'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        )}

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          {user && (
            <div className="flex items-center gap-1.5 bg-stone-100 px-2 py-1 rounded-md text-[11px] font-bold text-stone-700">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  realtimeStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span className="max-w-[80px] truncate">{user.name}</span>
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 focus:outline-hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 py-4 space-y-1.5 shadow-lg animate-in slide-in-from-top duration-200">
          <button
            onClick={() => handleNav('home')}
            className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
              currentView === 'home' ? 'bg-stone-100 text-stone-900' : 'text-stone-600'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>

          {user ? (
            <>
              <div className="px-3 py-2 bg-stone-50 rounded-lg text-xs border border-stone-100">
                <p className="font-semibold text-stone-900">{restaurant?.name}</p>
                <p className="text-stone-500">
                  {user.email} ({isOwner ? 'Owner' : isWaiter ? 'Waiter' : 'Kitchen Staff'})
                </p>
              </div>

              {isOwner && (
                <>
                  <button
                    onClick={() => handleNav('dashboard')}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      currentView === 'dashboard' ? 'bg-amber-500 text-white' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => handleNav('orders')}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      currentView === 'orders' ? 'bg-amber-500 text-white' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span>Orders</span>
                  </button>

                  <button
                    onClick={() => handleNav('menu')}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      currentView === 'menu' ? 'bg-amber-500 text-white' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>Menu</span>
                  </button>

                  <button
                    onClick={() => handleNav('tables')}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      currentView === 'tables' ? 'bg-amber-500 text-white' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Tables & QR</span>
                  </button>

                  <button
                    onClick={() => handleNav('staff')}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      currentView === 'staff' ? 'bg-amber-600 text-white' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Staff Management</span>
                  </button>

                  <button
                    onClick={() => handleNav('profile')}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      currentView === 'profile' ? 'bg-amber-500 text-white' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    <span>Restaurant Profile</span>
                  </button>
                </>
              )}

              {isWaiter && (
                <>
                  <button
                    onClick={() => handleNav('waiter')}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      currentView === 'waiter' ? 'bg-sky-600 text-white' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    <span>Waiter Station</span>
                  </button>

                  <button
                    onClick={() => handleNav('orders')}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      currentView === 'orders' ? 'bg-sky-600 text-white' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span>Orders</span>
                  </button>

                  <button
                    onClick={() => handleNav('tables')}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      currentView === 'tables' ? 'bg-sky-600 text-white' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Floor Tables</span>
                  </button>
                </>
              )}

              {isKitchen && (
                <button
                  onClick={() => handleNav('kitchen')}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    currentView === 'kitchen' ? 'bg-orange-600 text-white' : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <ChefHat className="w-4 h-4" />
                  <span>Kitchen Display (KDS)</span>
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleNav('home')}
                className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  currentView === 'home' ? 'bg-stone-100 text-stone-900' : 'text-stone-600'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>

              <button
                onClick={() => {
                  handleNav('home');
                  setTimeout(() => {
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }}
                className="w-full px-3 py-2 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 text-left flex items-center gap-2"
              >
                <span>How It Works</span>
              </button>

              <button
                onClick={() => {
                  handleNav('home');
                  setTimeout(() => {
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }}
                className="w-full px-3 py-2 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 text-left flex items-center gap-2"
              >
                <span>Features</span>
              </button>

              <button
                onClick={() => {
                  handleNav('home');
                  setTimeout(() => {
                    document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }}
                className="w-full px-3 py-2 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 text-left flex items-center gap-2"
              >
                <span>Product Preview</span>
              </button>

              <button
                onClick={() => {
                  handleNav('home');
                  setTimeout(() => {
                    document.getElementById('why-choose')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }}
                className="w-full px-3 py-2 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 text-left flex items-center gap-2"
              >
                <span>Why Digital</span>
              </button>

              <div className="h-px bg-stone-200 my-1" />

              <button
                onClick={() => handleNav('login')}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  currentView === 'login' ? 'bg-stone-100 text-stone-900' : 'text-stone-600'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Owner & Staff Login</span>
              </button>

              <button
                onClick={() => handleNav('register')}
                className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-amber-600 text-white flex items-center justify-center gap-2 shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Restaurant</span>
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
};
