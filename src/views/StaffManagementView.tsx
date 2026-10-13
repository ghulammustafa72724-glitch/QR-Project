import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Utensils,
  ChefHat,
  Bell,
  RefreshCw,
  Search,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Edit2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StaffMember } from '../types';
import { useRealtimeSubscription } from '../context/RealtimeContext';

export const StaffManagementView: React.FC = () => {
  const { token, user } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'waiter' | 'kitchen_staff'>('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isConfirmDeactivateOpen, setIsConfirmDeactivateOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'waiter' as 'waiter' | 'kitchen_staff',
  });
  const [newPassword, setNewPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'waiter' | 'kitchen_staff'>('waiter');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/staff', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load staff list.');
      }
      setStaffList(data.staff || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load staff list.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Subscribe to real-time staff updates
  useRealtimeSubscription('staff.updated', () => {
    fetchStaff();
  });

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormLoading(true);
    setFormError(null);

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create staff member.');
      }

      showNotification(`Staff member "${formData.name}" added successfully.`);
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'waiter' });
      fetchStaff();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create staff member.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedStaff) return;
    setFormLoading(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/staff/${selectedStaff.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: selectedRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update role.');
      }

      showNotification(`Role for "${selectedStaff.name}" changed to ${selectedRole === 'waiter' ? 'Waiter' : 'Kitchen Staff'}.`);
      setIsRoleModalOpen(false);
      setSelectedStaff(null);
      fetchStaff();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update role.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedStaff) return;
    setFormLoading(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/staff/${selectedStaff.id}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      showNotification(`Password for "${selectedStaff.name}" has been updated.`);
      setIsPasswordModalOpen(false);
      setSelectedStaff(null);
      setNewPassword('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to reset password.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!token || !selectedStaff) return;
    setFormLoading(true);
    const targetStatus = selectedStaff.status === 'active' ? 'inactive' : 'active';

    try {
      const res = await fetch(`/api/staff/${selectedStaff.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status.');
      }

      showNotification(`Account for "${selectedStaff.name}" is now ${targetStatus}.`);
      setIsConfirmDeactivateOpen(false);
      setSelectedStaff(null);
      fetchStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle staff status.');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const waiterCount = staffList.filter((s) => s.role === 'waiter').length;
  const kitchenCount = staffList.filter((s) => s.role === 'kitchen_staff').length;
  const activeCount = staffList.filter((s) => s.status === 'active').length;

  return (
    <div className="py-6 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Part 7: Multi-User Architecture
            </span>
            <span className="text-xs text-stone-400">•</span>
            <span className="text-xs text-stone-500 font-medium">Owner Administration</span>
          </div>
          <h1 className="text-2xl font-black text-stone-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-600" />
            Restaurant Staff Management
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Manage authenticated waiter and kitchen staff members with role-isolated operational permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStaff}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors disabled:opacity-50"
            title="Refresh staff list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-amber-700 transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff Member
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 block mb-1">Total Staff</span>
          <span className="text-2xl font-black text-stone-900">{staffList.length}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-sky-600 block mb-1 flex items-center gap-1">
            <Utensils className="w-3.5 h-3.5" /> Waiters
          </span>
          <span className="text-2xl font-black text-sky-900">{waiterCount}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-orange-600 block mb-1 flex items-center gap-1">
            <ChefHat className="w-3.5 h-3.5" /> Kitchen Staff
          </span>
          <span className="text-2xl font-black text-orange-900">{kitchenCount}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-600 block mb-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Active Accounts
          </span>
          <span className="text-2xl font-black text-emerald-900">{activeCount}</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by staff name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              roleFilter === 'all'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Roles
          </button>
          <button
            onClick={() => setRoleFilter('waiter')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
              roleFilter === 'waiter'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            Waiters
          </button>
          <button
            onClick={() => setRoleFilter('kitchen_staff')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
              roleFilter === 'kitchen_staff'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            Kitchen Staff
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-stone-500">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600 mb-2" />
            <p className="text-xs font-semibold">Loading restaurant staff roster...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-stone-800 mb-1">Failed to load staff</p>
            <p className="text-xs text-stone-500 mb-3">{error}</p>
            <button
              onClick={fetchStaff}
              className="px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold"
            >
              Try Again
            </button>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 mb-1">
              {staffList.length === 0 ? 'No staff members added yet' : 'No staff matched your filter'}
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
              {staffList.length === 0
                ? 'Create waiter and kitchen staff accounts so your team can log in, receive real-time table orders, and manage service calls.'
                : 'Try adjusting your search query or role filter.'}
            </p>
            {staffList.length === 0 && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors inline-flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                Add Your First Staff Member
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-stone-50/75 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow-xs ${
                            staff.role === 'waiter'
                              ? 'bg-sky-100 text-sky-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {staff.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-stone-900 block">{staff.name}</span>
                          <span className="text-[11px] text-stone-500 block">{staff.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {staff.role === 'waiter' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 font-bold text-[11px]">
                          <Utensils className="w-3 h-3" /> Waiter
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 font-bold text-[11px]">
                          <ChefHat className="w-3 h-3" /> Kitchen Staff
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {staff.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-stone-500">
                      {new Date(staff.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Change Role Button */}
                        <button
                          onClick={() => {
                            setSelectedStaff(staff);
                            setSelectedRole(staff.role as 'waiter' | 'kitchen_staff');
                            setFormError(null);
                            setIsRoleModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors"
                          title="Change operational role"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Reset Password Button */}
                        <button
                          onClick={() => {
                            setSelectedStaff(staff);
                            setNewPassword('');
                            setFormError(null);
                            setIsPasswordModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors"
                          title="Reset staff password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {/* Deactivate/Activate Button */}
                        <button
                          onClick={() => {
                            setSelectedStaff(staff);
                            setIsConfirmDeactivateOpen(true);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors border ${
                            staff.status === 'active'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {staff.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Staff Member */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-600" />
                Add Staff Member
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Waiter"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="waiter@restaurant.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Assigned Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'waiter' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.role === 'waiter'
                        ? 'border-sky-500 bg-sky-50 text-sky-900 ring-2 ring-sky-500/20'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                      <Utensils className="w-3.5 h-3.5 text-sky-600" />
                      Waiter
                    </div>
                    <p className="text-[10px] text-stone-500">Table alerts, guest calls & order serving</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'kitchen_staff' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.role === 'kitchen_staff'
                        ? 'border-orange-500 bg-orange-50 text-orange-900 ring-2 ring-orange-500/20'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                      <ChefHat className="w-3.5 h-3.5 text-orange-600" />
                      Kitchen Staff
                    </div>
                    <p className="text-[10px] text-stone-500">Live KDS queue & cooking progress</p>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Role */}
      {isRoleModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-black text-stone-900">Change Staff Role</h3>
            <p className="text-xs text-stone-500">
              Updating the operational role for <span className="font-bold text-stone-800">{selectedStaff.name}</span>.
            </p>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateRole} className="space-y-3">
              <div className="space-y-2">
                <label
                  onClick={() => setSelectedRole('waiter')}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                    selectedRole === 'waiter'
                      ? 'border-sky-500 bg-sky-50 text-sky-900'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    checked={selectedRole === 'waiter'}
                    onChange={() => setSelectedRole('waiter')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <div>
                    <span className="font-bold text-xs block">Waiter</span>
                    <span className="text-[10px] text-stone-500">Access to waiter station & table calls</span>
                  </div>
                </label>

                <label
                  onClick={() => setSelectedRole('kitchen_staff')}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                    selectedRole === 'kitchen_staff'
                      ? 'border-orange-500 bg-orange-50 text-orange-900'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    checked={selectedRole === 'kitchen_staff'}
                    onChange={() => setSelectedRole('kitchen_staff')}
                    className="text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="font-bold text-xs block">Kitchen Staff</span>
                    <span className="text-[10px] text-stone-500">Access to kitchen display & prep orders</span>
                  </div>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 disabled:opacity-50"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {isPasswordModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              Reset Staff Password
            </h3>
            <p className="text-xs text-stone-500">
              Set a new secure credential for <span className="font-bold text-stone-800">{selectedStaff.name}</span>. Existing sessions will be terminated immediately.
            </p>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 disabled:opacity-50"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Deactivation */}
      {isConfirmDeactivateOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-black text-stone-900">
                {selectedStaff.status === 'active' ? 'Deactivate Staff Account?' : 'Reactivate Staff Account?'}
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                {selectedStaff.status === 'active' ? (
                  <>
                    Deactivating <span className="font-bold text-stone-800">{selectedStaff.name}</span> will immediately revoke their access and terminate all active operational connections.
                  </>
                ) : (
                  <>
                    Reactivating <span className="font-bold text-stone-800">{selectedStaff.name}</span> will restore their ability to log in and access the system.
                  </>
                )}
              </p>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsConfirmDeactivateOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={formLoading}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-50 ${
                  selectedStaff.status === 'active'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {selectedStaff.status === 'active' ? 'Yes, Deactivate' : 'Yes, Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
