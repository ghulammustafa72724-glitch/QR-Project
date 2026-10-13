import React, { useState } from 'react';
import {
  QrCode,
  UtensilsCrossed,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  Store,
  Clock,
  ShoppingBag,
  ChefHat,
  ClipboardCheck,
  Layers,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Printer,
  ChevronRight,
  LayoutDashboard,
  LogIn,
  UserPlus,
  Flame,
  ArrowDown,
  Bell,
  Eye,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CurrentView } from '../components/Navbar';

interface HomeViewProps {
  onNavigate: (view: CurrentView) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const { user, restaurant } = useAuth();
  const [activeExperienceTab, setActiveExperienceTab] = useState<'customer' | 'restaurant'>('customer');
  const [demoCartCount, setDemoCartCount] = useState(2);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full bg-stone-50 text-stone-900 font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* ========================================================================= */}
      {/* SECTION 1 — HERO                                                          */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 border-b border-stone-200/80 bg-linear-to-b from-stone-100/60 via-stone-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Column: Value Proposition & CTAs */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* Quiet Pre-Header Eyebrow (No pill capsule, clean editorial text) */}
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Next-Gen Tabletop Technology</span>
                <span className="text-stone-300">·</span>
                <span className="text-stone-500 normal-case font-medium">Contactless Dine-In</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-[44px] font-extrabold text-stone-950 tracking-tight leading-[1.12] text-balance">
                Turn Every Table Into a Digital Ordering Experience
              </h1>

              {/* Supporting Paragraph */}
              <p className="text-base sm:text-lg text-stone-600 leading-relaxed font-normal max-w-xl">
                Empower your guests to scan a table QR code, browse a vibrant digital menu,
                and send customized orders straight to your kitchen. Eliminate waiting times,
                streamline your staff workflow, and modernize dining operations without expensive hardware.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {user ? (
                  <button
                    onClick={() => onNavigate('dashboard')}
                    className="px-6 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Go to {restaurant?.name || 'Restaurant'} Dashboard</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onNavigate('register')}
                      className="px-6 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
                    >
                      <span>Get Started</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                    <button
                      onClick={() => scrollToSection('how-it-works')}
                      className="px-6 py-3.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 font-semibold text-sm border border-stone-200/90 shadow-2xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>See How It Works</span>
                      <ArrowDown className="w-4 h-4 text-stone-500" />
                    </button>
                  </>
                )}
              </div>

              {/* Hero Benefit Line (Under CTA, subtle, no fake stats) */}
              <div className="pt-4 border-t border-stone-200/60 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-500">
                <span className="flex items-center gap-1.5 font-medium text-stone-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  QR Digital Menu
                </span>
                <span className="text-stone-300">·</span>
                <span className="flex items-center gap-1.5 font-medium text-stone-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Direct Table Ordering
                </span>
                <span className="text-stone-300">·</span>
                <span className="flex items-center gap-1.5 font-medium text-stone-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Easy Menu Management
                </span>
                <span className="text-stone-300">·</span>
                <span className="flex items-center gap-1.5 font-medium text-stone-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Organized Orders
                </span>
              </div>
            </div>

            {/* Right Column: High-Fidelity Product Flow Showcase */}
            <div className="lg:col-span-6 relative">
              {/* Product Visual Container */}
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                {/* Backplate Glow */}
                <div className="absolute -inset-1.5 bg-linear-to-r from-amber-500/10 to-orange-500/10 rounded-3xl blur-xl -z-10" />

                {/* Main Showcase Composite Card */}
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xl overflow-hidden p-4 sm:p-5">
                  {/* Visual Header: System Flow Indicator */}
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="font-bold text-stone-800">Live Dine-In Lifecycle</span>
                    </div>
                    <span className="text-stone-400 font-medium">Table 04 · Active Session</span>
                  </div>

                  {/* Flow Stages Ribbon */}
                  <div className="grid grid-cols-4 gap-1 mb-5 p-1.5 bg-stone-50 rounded-xl border border-stone-100 text-center">
                    <div className="py-1 px-1 rounded-lg bg-amber-50 border border-amber-200/80">
                      <p className="text-[10px] font-bold text-amber-900 leading-none">1. QR Scan</p>
                      <p className="text-[9px] text-amber-700 font-medium">Camera scan</p>
                    </div>
                    <div className="py-1 px-1 rounded-lg bg-white shadow-2xs border border-stone-200/60">
                      <p className="text-[10px] font-bold text-stone-900 leading-none">2. Menu</p>
                      <p className="text-[9px] text-stone-500 font-medium">Select food</p>
                    </div>
                    <div className="py-1 px-1 rounded-lg bg-white shadow-2xs border border-stone-200/60">
                      <p className="text-[10px] font-bold text-stone-900 leading-none">3. Cart</p>
                      <p className="text-[9px] text-stone-500 font-medium">Review & send</p>
                    </div>
                    <div className="py-1 px-1 rounded-lg bg-emerald-50 border border-emerald-200/80">
                      <p className="text-[10px] font-bold text-emerald-900 leading-none">4. Kitchen</p>
                      <p className="text-[9px] text-emerald-700 font-medium">Real-time prep</p>
                    </div>
                  </div>

                  {/* Mockup Dual Presentation: Smartphone Menu + Kitchen Ticket */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch">
                    {/* Left Inner Card: Smartphone Customer Menu */}
                    <div className="sm:col-span-7 bg-stone-50 rounded-xl p-3 border border-stone-200/80 flex flex-col justify-between">
                      <div>
                        {/* Mock Mobile Bar */}
                        <div className="flex items-center justify-between text-[11px] font-semibold text-stone-700 pb-2 mb-2 border-b border-stone-200/70">
                          <span className="flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-amber-600" />
                            Grand Bistro
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200/80 text-stone-700">
                            Table 04
                          </span>
                        </div>

                        {/* Category selection */}
                        <div className="flex gap-1.5 mb-2.5 text-[10px] font-semibold">
                          <span className="px-2 py-0.5 rounded-md bg-stone-900 text-white">Burgers</span>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-600">Starters</span>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-600">Drinks</span>
                        </div>

                        {/* Food Item Card */}
                        <div className="bg-white rounded-lg p-2.5 border border-stone-200/90 shadow-2xs">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-stone-900">Smoky Angus Burger</p>
                              <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">Charred beef, aged cheddar, caramelized onion</p>
                            </div>
                            <span className="text-xs font-extrabold text-stone-900 shrink-0">Rs 850.00</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[9px] text-stone-500 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-stone-400" /> 15–20 min
                            </span>
                            <button
                              onClick={() => setDemoCartCount((c) => c + 1)}
                              className="px-2 py-1 rounded bg-amber-600 text-white text-[10px] font-semibold flex items-center gap-1 hover:bg-amber-700 transition-colors cursor-pointer"
                            >
                              <span>+ Add</span>
                            </button>
                          </div>
                        </div>

                        {/* Second Food Item Card */}
                        <div className="bg-white rounded-lg p-2.5 border border-stone-200/90 shadow-2xs mt-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-stone-900">Truffle Parmesan Fries</p>
                              <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">Hand-cut russet fries, truffle aioli</p>
                            </div>
                            <span className="text-xs font-extrabold text-stone-900 shrink-0">Rs 450.00</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[9px] text-stone-500 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-stone-400" /> 10 min
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              Added
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Mock Floating Cart Bar */}
                      <div className="mt-3 p-2 bg-stone-900 text-white rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-semibold">{demoCartCount} items</span>
                          <span className="text-stone-400">·</span>
                          <span className="font-bold">Rs 1,300.00</span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                          Review Order <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>

                    {/* Right Inner Card: Kitchen Live Ticket */}
                    <div className="sm:col-span-5 bg-stone-900 text-stone-100 rounded-xl p-3 flex flex-col justify-between border border-stone-800">
                      <div>
                        {/* KDS Ticket Header */}
                        <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs font-bold text-white">Kitchen Display</span>
                          </div>
                          <span className="text-[10px] font-mono text-stone-400">#ORD-104</span>
                        </div>

                        {/* Order Metadata */}
                        <div className="flex items-center justify-between text-[11px] mb-2 font-medium text-stone-300">
                          <span className="text-amber-400 font-bold">Table 04</span>
                          <span className="text-[10px] text-stone-400">Placed 2m ago</span>
                        </div>

                        {/* Items ordered */}
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between border-b border-stone-800/60 pb-1">
                            <span className="font-semibold text-white">1x Smoky Angus Burger</span>
                            <span className="text-[10px] text-stone-400">Medium</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-stone-800/60 pb-1">
                            <span className="font-semibold text-white">1x Truffle Fries</span>
                            <span className="text-[10px] text-stone-400">Crispy</span>
                          </div>
                        </div>

                        {/* Prep Status */}
                        <div className="mt-3 p-2 rounded-lg bg-stone-800/80 border border-stone-700/60 text-center">
                          <p className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Status: Preparing</p>
                          <p className="text-xs font-mono font-bold text-stone-200 mt-0.5">14:20 remaining</p>
                        </div>
                      </div>

                      {/* Ready Action Button */}
                      <div className="mt-3 pt-2 border-t border-stone-800">
                        <div className="w-full py-1.5 bg-emerald-600/90 text-white rounded text-center text-xs font-semibold">
                          Mark Order Ready
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2 — HOW IT WORKS                                                  */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-16 sm:py-24 border-b border-stone-200/80 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Simple 4-Step Setup
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-950 tracking-tight">
              How Your Restaurant Goes Digital
            </h2>
            <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
              Launch self-ordering across your dining room in minutes. No proprietary hardware,
              no technical complexity, and zero maintenance overhead.
            </p>
          </div>

          {/* 4 Connected Process Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="relative bg-stone-50 rounded-2xl p-6 border border-stone-200/80 hover:border-amber-400/80 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-white border border-stone-200 text-amber-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <Store className="w-6 h-6" />
                  </div>
                  <span className="text-3xl font-extrabold text-stone-300 font-mono">01</span>
                </div>
                <h3 className="text-base font-bold text-stone-900 mb-2">Create Your Restaurant</h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  Create an account and set up restaurant information including name, phone, address, and operating hours.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-stone-200/60 text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                <span>Instant Owner Account</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative bg-stone-50 rounded-2xl p-6 border border-stone-200/80 hover:border-amber-400/80 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-white border border-stone-200 text-amber-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <UtensilsCrossed className="w-6 h-6" />
                  </div>
                  <span className="text-3xl font-extrabold text-stone-300 font-mono">02</span>
                </div>
                <h3 className="text-base font-bold text-stone-900 mb-2">Build Your Digital Menu</h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  Add categories, food items, prices in Rs, rich descriptions, prep times, and toggle real-time availability.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-stone-200/60 text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                <span>Instant Price & Stock Updates</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative bg-stone-50 rounded-2xl p-6 border border-stone-200/80 hover:border-amber-400/80 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-white border border-stone-200 text-amber-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <span className="text-3xl font-extrabold text-stone-300 font-mono">03</span>
                </div>
                <h3 className="text-base font-bold text-stone-900 mb-2">Create Table QR Codes</h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  Create your restaurant tables and generate unique QR codes with one-click print and download ready formats.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-stone-200/60 text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                <span>Download & Print Ready</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative bg-stone-50 rounded-2xl p-6 border border-stone-200/80 hover:border-amber-400/80 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-white border border-stone-200 text-amber-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <span className="text-3xl font-extrabold text-stone-300 font-mono">04</span>
                </div>
                <h3 className="text-base font-bold text-stone-900 mb-2">Customers Scan & Order</h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  Customers scan the QR code, browse the menu, add food to their cart, and place the order directly from their phone.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-stone-200/60 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <span>Orders Stream to Kitchen</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3 — CORE FEATURES                                                 */}
      {/* ========================================================================= */}
      <section id="features" className="py-16 sm:py-24 border-b border-stone-200/80 bg-stone-50/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Essential Capabilities
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-950 tracking-tight">
              Everything Your Restaurant Needs for Digital Ordering
            </h2>
            <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
              Every tool engineered to eliminate dining bottlenecks, reduce labor pressure,
              and delight your dining guests.
            </p>
          </div>

          {/* Exactly 6 High-Quality Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 — QR Digital Menus */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all duration-200 space-y-3 group">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60 group-hover:scale-105 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">QR Digital Menus</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Customers scan a QR code at their table and instantly open the restaurant's digital menu on their smartphone without installing any app.
              </p>
            </div>

            {/* Feature 2 — Easy Menu Management */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all duration-200 space-y-3 group">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60 group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Easy Menu Management</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Restaurant owners can manage categories, food items, prices in Rs, descriptions, and one-click item availability toggling in real time.
              </p>
            </div>

            {/* Feature 3 — Table QR Management */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all duration-200 space-y-3 group">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Table QR Management</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Create restaurant tables, generate dedicated QR codes for each table, preview codes instantly, and print high-resolution table stand graphics.
              </p>
            </div>

            {/* Feature 4 — Direct Customer Ordering */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all duration-200 space-y-3 group">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Direct Customer Ordering</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Customers can browse food, select quantities, add items to their cart, provide special cooking instructions, and place orders directly from the table.
              </p>
            </div>

            {/* Feature 5 — Order Management */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all duration-200 space-y-3 group">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60 group-hover:scale-105 transition-transform">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Order Management</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Restaurant staff can view incoming orders in real time, inspect itemized lists, and update status from pending to preparing, ready, and completed.
              </p>
            </div>

            {/* Feature 6 — Kitchen Display */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all duration-200 space-y-3 group">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60 group-hover:scale-105 transition-transform">
                <ChefHat className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Kitchen Display</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Kitchen staff can work with the dedicated kitchen order workflow, view countdown preparation timers, and manage meal readiness efficiently.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4 — PRODUCT EXPERIENCE                                            */}
      {/* ========================================================================= */}
      <section id="experience" className="py-16 sm:py-24 border-b border-stone-200/80 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Interactive Showcase
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-950 tracking-tight">
              See the Experience Your Customers and Team Get
            </h2>
            <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
              Explore the two synchronized sides of the system: the guest dining interface
              and the operational console for your restaurant team.
            </p>
          </div>

          {/* Interactive Switcher Tab Controls */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200/80">
              <button
                onClick={() => setActiveExperienceTab('customer')}
                className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  activeExperienceTab === 'customer'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Smartphone className="w-4 h-4 text-amber-600" />
                <span>Customer Mobile Experience</span>
              </button>
              <button
                onClick={() => setActiveExperienceTab('restaurant')}
                className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  activeExperienceTab === 'restaurant'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-amber-600" />
                <span>Restaurant Management Console</span>
              </button>
            </div>
          </div>

          {/* Dynamic Interactive Experience Frame */}
          {activeExperienceTab === 'customer' ? (
            /* TAB 1: CUSTOMER EXPERIENCE */
            <div className="bg-stone-50 rounded-2xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Explanation on Left */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200/60">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile Browser View · Table 02</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                    Frictionless Dining from Any Smartphone
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    When customers sit at a table, they simply open their camera and scan the QR code.
                    The digital menu loads instantly with your restaurant branding, categories, photos,
                    and item descriptions.
                  </p>
                  <ul className="space-y-2.5 text-xs text-stone-600 pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Instant category filtering and search</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Prices presented in Pakistani Rupees (Rs)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Quantity selection and optional special instructions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Floating cart review drawer and direct order submission</span>
                    </li>
                  </ul>
                </div>

                {/* Simulated Customer Menu Phone Frame */}
                <div className="lg:col-span-7 flex justify-center">
                  <div className="w-full max-w-sm bg-white rounded-3xl border-4 border-stone-800 shadow-2xl overflow-hidden text-stone-800">
                    {/* Simulated Mobile Status Notch */}
                    <div className="bg-stone-800 text-white px-5 py-2 flex items-center justify-between text-[11px] font-mono">
                      <span>9:41</span>
                      <div className="w-16 h-3 bg-stone-900 rounded-full" />
                      <span>5G 100%</span>
                    </div>

                    {/* Restaurant Banner Header */}
                    <div className="bg-stone-900 text-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-base">Bella Italia Bistro</h4>
                          <p className="text-[11px] text-stone-300">Authentic Stone-Baked & Pasta</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                          Table 02
                        </span>
                      </div>
                    </div>

                    {/* Category Scroll Bar */}
                    <div className="p-3 bg-stone-50 border-b border-stone-200/80 flex gap-1.5 overflow-x-auto text-xs font-semibold">
                      <span className="px-3 py-1 rounded-lg bg-stone-900 text-white whitespace-nowrap">Main Course</span>
                      <span className="px-3 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 whitespace-nowrap">Wood-Fired Pizza</span>
                      <span className="px-3 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 whitespace-nowrap">Drinks</span>
                    </div>

                    {/* Food Items List */}
                    <div className="p-3.5 space-y-3 bg-white max-h-72 overflow-y-auto">
                      {/* Food Item 1 */}
                      <div className="p-2.5 rounded-xl border border-stone-200/80 bg-stone-50/50 flex gap-3 items-center">
                        <div className="w-14 h-14 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                          🍕
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-stone-900 truncate">Margherita Classica</p>
                          <p className="text-[10px] text-stone-500 line-clamp-1">San Marzano tomatoes, fresh buffalo mozzarella</p>
                          <p className="text-xs font-extrabold text-stone-900 mt-1">Rs 1,200.00</p>
                        </div>
                        <button className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-bold shadow-2xs hover:bg-amber-700">
                          + Add
                        </button>
                      </div>

                      {/* Food Item 2 */}
                      <div className="p-2.5 rounded-xl border border-stone-200/80 bg-stone-50/50 flex gap-3 items-center">
                        <div className="w-14 h-14 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                          🍝
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-stone-900 truncate">Fettuccine Truffle Alfredo</p>
                          <p className="text-[10px] text-stone-500 line-clamp-1">Fresh egg pasta, black truffle butter, parmesan</p>
                          <p className="text-xs font-extrabold text-stone-900 mt-1">Rs 1,450.00</p>
                        </div>
                        <button className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-bold shadow-2xs hover:bg-amber-700">
                          + Add
                        </button>
                      </div>
                    </div>

                    {/* Bottom Cart Drawer Trigger */}
                    <div className="p-3 bg-white border-t border-stone-200">
                      <div className="p-2.5 bg-stone-900 text-white rounded-xl flex items-center justify-between text-xs shadow-md">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-amber-400" />
                          <span className="font-semibold">2 items in cart</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-400">Rs 2,650.00</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: RESTAURANT EXPERIENCE */
            <div className="bg-stone-50 rounded-2xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Explanation on Left */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200/60">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Command Center & Kitchen KDS</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                    Complete Control Over Every Dining Table
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    Restaurant owners and kitchen staff receive incoming orders in real time.
                    Easily manage preparation workflows, monitor table activity, adjust food availability,
                    and coordinate kitchen preparation smoothly.
                  </p>
                  <ul className="space-y-2.5 text-xs text-stone-600 pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Live incoming orders with table numbers and itemized lists</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>One-click status workflow: Pending → Preparing → Ready → Completed</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Dynamic table QR generation with instant print mode</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Kitchen display system with live preparation timers</span>
                    </li>
                  </ul>
                </div>

                {/* Simulated Restaurant Dashboard Screen */}
                <div className="lg:col-span-7">
                  <div className="bg-white rounded-2xl border border-stone-200/90 shadow-md p-4 sm:p-5 text-stone-800">
                    {/* Console Header */}
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs font-bold">
                          KDS
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-900">Live Kitchen Display System</p>
                          <p className="text-[10px] text-stone-500">Real-Time Kitchen Queue</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ● WebSocket Connected
                      </span>
                    </div>

                    {/* Active Order Tickets Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Ticket 1: Preparing */}
                      <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-stone-900">Table 02</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                            Preparing (12m left)
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-700 space-y-1">
                          <div className="flex justify-between">
                            <span>1x Margherita Classica</span>
                            <span className="text-stone-400 font-mono">x1</span>
                          </div>
                          <div className="flex justify-between">
                            <span>1x Fettuccine Truffle</span>
                            <span className="text-stone-400 font-mono">x1</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                          <span className="font-extrabold text-stone-900">Rs 2,650.00</span>
                          <button className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-semibold">
                            Mark Ready
                          </button>
                        </div>
                      </div>

                      {/* Ticket 2: New Pending Order */}
                      <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-stone-900">Table 05</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">
                            Pending Approval
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-700 space-y-1">
                          <div className="flex justify-between">
                            <span>2x Grilled Chicken Panini</span>
                            <span className="text-stone-400 font-mono">x2</span>
                          </div>
                          <div className="flex justify-between">
                            <span>2x Iced Peach Tea</span>
                            <span className="text-stone-400 font-mono">x2</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                          <span className="font-extrabold text-stone-900">Rs 1,800.00</span>
                          <button className="px-2 py-1 rounded bg-amber-600 text-white text-[10px] font-semibold">
                            Accept Order
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5 — WHY CHOOSE THIS SYSTEM                                        */}
      {/* ========================================================================= */}
      <section id="why-choose" className="py-16 sm:py-24 border-b border-stone-200/80 bg-stone-50/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Operational Advantages
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-950 tracking-tight">
              Why Choose This System
            </h2>
            <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
              Designed specifically for fast casual, fine dining, and busy cafes looking to reduce operational friction and boost table turnover.
            </p>
          </div>

          {/* Value Props Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Benefit 1 */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Faster Table Turnover</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Guests place orders immediately upon being seated without waiting for staff to bring paper menus, cutting ordering delay by up to 15 minutes per table.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Printer className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Zero Paper Printing Costs</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Update prices in Rs, add daily specials, or disable sold-out dishes instantly in real time without paying expensive reprinting costs.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">100% Order Accuracy</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Customers select their exact items, quantities, and dietary notes directly, eliminating order errors and miscommunications between waiters and the kitchen.
              </p>
            </div>

            {/* Benefit 4 */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <ChefHat className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Direct Kitchen Coordination</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Orders route directly to the kitchen display screen with prep times and batch quantities, ensuring cooks stay synchronized during busy rush hours.
              </p>
            </div>

            {/* Benefit 5 */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">No App Download Required</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Diners scan the table QR code and the menu opens natively in any mobile browser (Safari, Chrome, etc.). No app install, registration, or password required.
              </p>
            </div>

            {/* Benefit 6 */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Optimized for Pakistani Rupees (Rs)</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Standardized currency formatting in Rs across customer menus, cart totals, invoices, and kitchen tickets tailored for regional restaurant compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 6 — FINAL CTA + FOOTER                                            */}
      {/* ========================================================================= */}
      <footer className="bg-stone-950 text-stone-200 pt-16 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Conversion CTA Banner Block */}
          <div className="relative rounded-3xl bg-linear-to-b from-stone-900 to-stone-950 border border-stone-800 p-8 sm:p-12 text-center overflow-hidden">
            <div className="max-w-2xl mx-auto space-y-5 relative z-10">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Ready to Upgrade Your Restaurant?
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Turn Your Tables Into High-Speed Ordering Stations Today
              </h2>
              <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
                Create your restaurant account, upload your digital menu, and generate table QR codes in under five minutes.
              </p>

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                {user ? (
                  <button
                    onClick={() => onNavigate('dashboard')}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Go to {restaurant?.name || 'Restaurant'} Dashboard</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onNavigate('register')}
                      className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Register Your Restaurant</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onNavigate('login')}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-sm border border-stone-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Owner Sign In</span>
                    </button>
                  </>
                )}
              </div>

              <p className="text-xs text-stone-400 pt-2">
                Instant setup · No app installation required for diners · Works on all mobile devices
              </p>
            </div>
          </div>

          {/* Clean SaaS Footer Navigation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-4 border-t border-stone-800/80 text-xs">
            {/* Column 1: Brand & Description */}
            <div className="md:col-span-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <span className="font-bold text-white text-base tracking-tight">QR Restaurant</span>
              </div>
              <p className="text-stone-400 leading-relaxed">
                Modern tabletop QR ordering, digital menu management, and real-time kitchen display technology.
              </p>
              <div className="pt-1 text-[11px] text-stone-500">
                <span>Currency: </span>
                <span className="font-semibold text-stone-300">Pakistani Rupee (Rs)</span>
              </div>
            </div>

            {/* Column 2: System Capabilities */}
            <div className="space-y-2.5">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">System Workflow</p>
              <ul className="space-y-2 text-stone-400">
                <li>
                  <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors cursor-pointer">
                    How It Works
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors cursor-pointer">
                    Core Features
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('experience')} className="hover:text-white transition-colors cursor-pointer">
                    Product Experience
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('why-choose')} className="hover:text-white transition-colors cursor-pointer">
                    Why Digital
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Platform Features */}
            <div className="space-y-2.5">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Modules</p>
              <ul className="space-y-2 text-stone-400">
                <li className="flex items-center gap-1.5">
                  <QrCode className="w-3 h-3 text-amber-500" />
                  <span>QR Table Generator</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <ShoppingBag className="w-3 h-3 text-amber-500" />
                  <span>Customer Digital Menu</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <ClipboardCheck className="w-3 h-3 text-amber-500" />
                  <span>Live Order Management</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <ChefHat className="w-3 h-3 text-amber-500" />
                  <span>Kitchen Display (KDS)</span>
                </li>
              </ul>
            </div>

            {/* Column 4: Quick Access */}
            <div className="space-y-2.5">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Access Portal</p>
              <div className="space-y-2">
                <button
                  onClick={() => onNavigate('login')}
                  className="block text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  Restaurant Owner Login
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className="block text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  Create Restaurant Account
                </button>
                {user && (
                  <button
                    onClick={() => onNavigate('dashboard')}
                    className="block text-amber-400 hover:text-amber-300 font-semibold transition-colors cursor-pointer"
                  >
                    Open Owner Dashboard →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Copyright Bar */}
          <div className="pt-8 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400">
            <p>© {new Date().getFullYear()} QR Restaurant Ordering System. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Real-Time Engine Active</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
