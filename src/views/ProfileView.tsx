import React, { useState, useEffect } from 'react';
import {
  Store,
  Save,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  FileText,
  Building,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProfileViewProps {
  onBackToDashboard: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onBackToDashboard }) => {
  const { restaurant, user, updateRestaurant } = useAuth();

  const [name, setName] = useState(restaurant?.name || '');
  const [description, setDescription] = useState(restaurant?.description || '');
  const [phone, setPhone] = useState(restaurant?.phone || '');
  const [email, setEmail] = useState(restaurant?.email || '');
  const [address, setAddress] = useState(restaurant?.address || '');

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name || '');
      setDescription(restaurant.description || '');
      setPhone(restaurant.phone || '');
      setEmail(restaurant.email || '');
      setAddress(restaurant.address || '');
    }
  }, [restaurant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Restaurant name cannot be empty.');
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please provide a valid contact email format.');
      return;
    }

    setIsSaving(true);
    const res = await updateRestaurant({
      name: name.trim(),
      description: description.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
    });
    setIsSaving(false);

    if (res.success) {
      setSuccessMessage('Restaurant profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error || 'Failed to update restaurant profile.');
    }
  };

  const formattedCreated = restaurant?.created_at
    ? new Date(restaurant.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const formattedUpdated = restaurant?.updated_at
    ? new Date(restaurant.updated_at).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="max-w-4xl w-full mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>Created on {formattedCreated}</span>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/50">
                <Store className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                Restaurant Profile Settings
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-stone-500">
              Manage your public restaurant details and contact information.
            </p>
          </div>
          <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">
            Owner ID: {user?.id ? `${user.id.slice(0, 6)}...` : 'Verified'}
          </span>
        </div>

        {/* Feedback Alerts */}
        {successMessage && (
          <div className="mt-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="font-medium">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <p className="font-medium">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Restaurant Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5" htmlFor="prof-name">
              Restaurant Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Building className="w-4 h-4" />
              </div>
              <input
                id="prof-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Trattoria Bella Vista"
                className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all font-medium"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5" htmlFor="prof-desc">
              Description / Bio
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3.5 pointer-events-none text-stone-400">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                id="prof-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Authentic wood-fired pizza and handmade pasta in downtown..."
                className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all"
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Brief summary shown to dining guests.</p>
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5" htmlFor="prof-phone">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="prof-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5" htmlFor="prof-email">
                Public Contact Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="prof-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@restaurant.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Physical Address */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5" htmlFor="prof-address">
              Physical Restaurant Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                id="prof-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Culinary Ave, Suite 100, Cityville"
                className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-stone-500 order-2 sm:order-1">
              {formattedUpdated ? `Last modified today at ${formattedUpdated}` : 'All changes saved to database'}
            </span>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold rounded-xl text-sm shadow-xs transition-colors flex items-center justify-center gap-2 order-1 sm:order-2"
            >
              {isSaving ? (
                <span>Saving updates...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
