import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { Navbar, CurrentView } from './components/Navbar';
import { HomeView } from './views/HomeView';
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';
import { DashboardView } from './views/DashboardView';
import { ProfileView } from './views/ProfileView';
import { MenuView } from './views/MenuView';
import { TablesView } from './views/TablesView';
import { OrdersView } from './views/OrdersView';
import { KitchenView } from './views/KitchenView';
import { WaiterView } from './views/WaiterView';
import { StaffManagementView } from './views/StaffManagementView';
import { PublicTableScanView } from './views/PublicTableScanView';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<CurrentView>(
    () => (sessionStorage.getItem('currentView') as CurrentView) || 'home'
  );

  const navigateTo = (view: CurrentView) => {
    sessionStorage.setItem('currentView', view);
    setCurrentView(view);
  };
  const [publicRoute, setPublicRoute] = useState<{
    restaurantId: string;
    tableId: string;
  } | null>(null);

  // Check URL on load and popstate for Public QR Scan Route (/r/:restaurantId/t/:tableId or ?r=...&t=...)
  useEffect(() => {
    const parseRoute = () => {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);

      // Check pathname pattern: /r/:restaurantId/t/:tableId
      const pathMatch = pathname.match(/^\/r\/([^\/]+)\/t\/([^\/]+)/);
      if (pathMatch) {
        setPublicRoute({
          restaurantId: pathMatch[1],
          tableId: pathMatch[2],
        });
        return;
      }

      // Check query params: ?r=...&t=...
      const rParam = searchParams.get('r');
      const tParam = searchParams.get('t');
      if (rParam && tParam) {
        setPublicRoute({
          restaurantId: rParam,
          tableId: tParam,
        });
        return;
      }

      setPublicRoute(null);
    };

    parseRoute();
    window.addEventListener('popstate', parseRoute);
    return () => window.removeEventListener('popstate', parseRoute);
  }, []);

  // Enforce Protected Routes: If not logged in and on protected views, redirect to login
  useEffect(() => {
    const isProtected =
      currentView === 'dashboard' ||
      currentView === 'profile' ||
      currentView === 'menu' ||
      currentView === 'tables' ||
      currentView === 'orders' ||
      currentView === 'kitchen' ||
      currentView === 'waiter' ||
      currentView === 'staff';

    if (!isLoading && !user && isProtected && !publicRoute) {
      navigateTo('login');
      return;
    }

    // Role-based view guards
    if (!isLoading && user && !publicRoute) {
      if (user.role === 'waiter') {
        const waiterAllowed = currentView === 'waiter' || currentView === 'orders';
        if (!waiterAllowed && isProtected) {
          navigateTo('waiter');
        }
      } else if (user.role === 'kitchen_staff') {
        const kitchenAllowed = currentView === 'kitchen' || currentView === 'orders';
        if (!kitchenAllowed && isProtected) {
          navigateTo('kitchen');
        }
      } else if (user.role === 'restaurant_owner') {
        // Owner has access to all views
      }
    }
  }, [user, isLoading, currentView, publicRoute]);

  const handleNavigateHome = () => {
    window.history.pushState({}, '', '/');
    setPublicRoute(null);
    navigateTo('home');
  };

  // If scanning a QR code publicly, render PublicTableScanView without requiring login!
  if (publicRoute) {
    return (
      <PublicTableScanView
        restaurantId={publicRoute.restaurantId}
        tableId={publicRoute.tableId}
        onNavigateHome={handleNavigateHome}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-stone-600">Verifying session credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col font-sans antialiased selection:bg-amber-100 selection:text-amber-900">
      <Navbar currentView={currentView} onNavigate={navigateTo} />

      <main className={currentView === 'home' ? 'flex-1 w-full' : 'flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6'}>
        {currentView === 'home' && <HomeView onNavigate={navigateTo} />}

        {currentView === 'login' && (
          <LoginView
            onSuccess={(role) => {
              if (role === 'waiter') {
                navigateTo('waiter');
              } else if (role === 'kitchen_staff') {
                navigateTo('kitchen');
              } else {
                navigateTo('dashboard');
              }
            }}
            onNavigateRegister={() => navigateTo('register')}
          />
        )}

        {currentView === 'register' && (
          <RegisterView
            onSuccess={() => navigateTo('dashboard')}
            onNavigateLogin={() => navigateTo('login')}
          />
        )}

        {/* Protected View: Dashboard (Owner only) */}
        {currentView === 'dashboard' && user && (
          <DashboardView
            onNavigateProfile={() => navigateTo('profile')}
            onNavigateMenu={() => navigateTo('menu')}
            onNavigateTables={() => navigateTo('tables')}
            onNavigateOrders={() => navigateTo('orders')}
            onNavigateKitchen={() => navigateTo('kitchen')}
            onNavigateWaiter={() => navigateTo('waiter')}
            onNavigateStaff={() => navigateTo('staff')}
          />
        )}

        {/* Protected View: Order Management */}
        {currentView === 'orders' && user && (
          <OrdersView
            onNavigateKitchen={() => navigateTo('kitchen')}
            onNavigateTables={() => navigateTo('tables')}
          />
        )}

        {/* Protected View: Kitchen Display System (KDS) */}
        {currentView === 'kitchen' && user && (
          <KitchenView
            onNavigateOrders={() => navigateTo('orders')}
          />
        )}

        {/* Protected View: Waiter Station (Part 7) */}
        {currentView === 'waiter' && user && (
          <WaiterView
            onNavigateOrders={() => navigateTo('orders')}
            onNavigateTables={() => navigateTo('tables')}
          />
        )}

        {/* Protected View: Staff Management (Part 7, Owner only) */}
        {currentView === 'staff' && user && (
          <StaffManagementView />
        )}

        {/* Protected View: Digital Menu */}
        {currentView === 'menu' && user && <MenuView />}

        {/* Protected View: Restaurant Tables & QR */}
        {currentView === 'tables' && user && <TablesView />}

        {/* Protected View: Restaurant Profile */}
        {currentView === 'profile' && user && (
          <ProfileView onBackToDashboard={() => navigateTo('dashboard')} />
        )}
      </main>

      {currentView !== 'home' && (
        <footer className="border-t border-stone-200 bg-white py-6 mt-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
            <div>
              <span className="font-semibold text-stone-700">QR Restaurant Ordering System</span>
              <span className="mx-2">•</span>
              <span>Part 7: Waiter/Staff System & Real-Time Updates</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Live WebSockets, Waiter Station, Staff RBAC & Table Calling</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <AppContent />
      </RealtimeProvider>
    </AuthProvider>
  );
}
