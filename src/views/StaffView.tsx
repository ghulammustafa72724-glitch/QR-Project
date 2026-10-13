import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  ChefHat,
  Bell,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { StaffMember, StaffRole, StaffStatus, StaffSummaryCounts } from '../types';
import { useAuth } from '../context/AuthContext';

export const StaffView: React.FC = () => {
  const { token, user: currentUser } = useAuth();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [counts, setCounts] = useState<StaffSummaryCounts>({
    total: 0,
    activeWaiters: 0,
    activeKitchen: 0,
    inactive: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | StaffRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | StaffStatus>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deleteConfirmStaff, setDeleteConfirmStaff] = useState<StaffMember | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'waiter' as StaffRole,
    phone: '',
    status: 'active' as StaffStatus,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch staff list
  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/staff', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load staff list.');
      } else {
        setStaff(data.staff || []);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch {
      setError('Network error while loading staff members.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'waiter',
      phone: '',
      status: 'active',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (member: StaffMember) => {
    setEditingStaff(member);
    setFormData({
      name: member.name,
      email: member.email,
      password: '', // Blank unless changing
      role: member.role,
      phone: member.phone || '',
      status: member.status,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit create or edit form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const isEdit = !!editingStaff;
      const url = isEdit ? `/api/staff/${editingStaff.id}` : '/api/staff';
      const method = isEdit ? 'PUT' : 'POST';

      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        phone: formData.phone.trim(),
      };

      if (isEdit) {
        payload.status = formData.status;
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }
      } else {
        payload.password = formData.password.trim();
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to save staff account.');
      } else {
        setIsModalOpen(false);
        fetchStaff();
      }
    } catch {
      setFormError('Network error while saving staff details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active/inactive
  const handleToggleStatus = async (member: StaffMember) => {
    const newStatus: StaffStatus = member.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: member.name,
          email: member.email,
          role: member.role,
          phone: member.phone || '',
          status: newStatus,
        }),
      });
      if (res.ok) {
        fetchStaff();
      }
    } catch {
      // Ignore
    }
  };

  // Delete staff
  const handleDeleteStaff = async () => {
    if (!deleteConfirmStaff) return;
    try {
      const res = await fetch(`/api/staff/${deleteConfirmStaff.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setDeleteConfirmStaff(null);
        fetchStaff();
      }
    } catch {
      // Ignore
    }
  };

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staff.filter((m) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesEmail = m.email.toLowerCase().includes(q);
        const matchesPhone = m.phone ? m.phone.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesEmail && !matchesPhone) return false;
      }
      // Role
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      // Status
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;

      return true;
    });
  }, [staff, searchQuery, roleFilter, statusFilter]);

  return (
    <div className="py-6 sm:py-8 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">Staff Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              Role Access
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Provision, manage, and assign roles to your waitstaff and kitchen team members.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchStaff}
            className="p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 transition-colors shadow-xs"
            title="Refresh Staff List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Staff</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900 mt-2">{counts.total}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Registered team accounts</div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Active Waiters</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-900 mt-2">{counts.activeWaiters}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Front of house staff</div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Kitchen Staff</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <ChefHat className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900 mt-2">{counts.activeKitchen}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Kitchen & KDS operators</div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Inactive Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-600 mt-2">{counts.inactive}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Deactivated access</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100/80 rounded-xl shrink-0 overflow-x-auto">
          {(['all', 'waiter', 'kitchen_staff'] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                roleFilter === role
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {role === 'all' ? 'All Roles' : role === 'waiter' ? 'Waiters' : 'Kitchen Staff'}
            </button>
          ))}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100/80 rounded-xl shrink-0 overflow-x-auto">
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {status === 'all' ? 'All Status' : status === 'active' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      {/* Staff List / Table */}
      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-stone-500">Loading staff records...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs text-center space-y-2">
          <AlertCircle className="w-6 h-6 mx-auto text-red-600" />
          <p className="font-semibold">{error}</p>
          <button
            type="button"
            onClick={fetchStaff}
            className="mt-2 px-3 py-1 bg-white border border-red-300 rounded-lg text-red-700 font-semibold"
          >
            Try Again
          </button>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white border border-stone-200/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900">No staff members found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
              ? 'No staff members match the selected filters.'
              : 'You have not added any staff members yet. Create waiter or kitchen accounts to delegate duties.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="mt-2 inline-flex items-center gap-2 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add First Staff Member</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((member) => {
            const isWaiter = member.role === 'waiter';
            const isActive = member.status === 'active';
            const joinedDate = new Date(member.created_at).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={member.id}
                className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs hover:border-stone-300 transition-all space-y-4 flex flex-col justify-between"
              >
                <div>
                  {/* Top: Role & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        isWaiter
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isWaiter ? <Bell className="w-3 h-3" /> : <ChefHat className="w-3 h-3" />}
                      <span>{isWaiter ? 'Waiter / Service' : 'Kitchen Staff'}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(member)}
                      title={`Click to mark as ${isActive ? 'inactive' : 'active'}`}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-stone-400'}`}></span>
                      <span>{isActive ? 'Active' : 'Inactive'}</span>
                    </button>
                  </div>

                  {/* Name and Credentials */}
                  <div className="mt-3.5">
                    <h3 className="font-extrabold text-base text-stone-900 leading-tight">{member.name}</h3>
                    <div className="mt-2 space-y-1.5 text-xs text-stone-500">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{member.phone || 'No phone set'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>Joined {joinedDate}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(member)}
                    className="flex-1 py-1.5 px-3 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmStaff(member)}
                    className="py-1.5 px-3 rounded-lg border border-stone-200 hover:bg-red-50 hover:border-red-200 text-stone-400 hover:text-red-700 text-xs font-semibold transition-colors"
                    title="Remove staff member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  {editingStaff ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <h3 className="font-bold text-stone-900 text-base">
                  {editingStaff ? 'Edit Staff Member' : 'New Staff Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="E.g. Sarah Jenkins"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Login Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="sarah@restaurant.com"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Assigned Staff Role
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'waiter' })}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      formData.role === 'waiter'
                        ? 'border-sky-500 bg-sky-50/60 ring-1 ring-sky-500 text-sky-900'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <Bell className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Waiter</div>
                      <div className="text-[10px] text-stone-500 leading-tight mt-0.5">
                        Table service & order updates
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'kitchen_staff' })}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      formData.role === 'kitchen_staff'
                        ? 'border-amber-500 bg-amber-50/60 ring-1 ring-amber-500 text-amber-900'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                    }`}
                  >
                    <ChefHat className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Kitchen Staff</div>
                      <div className="text-[10px] text-stone-500 leading-tight mt-0.5">
                        KDS queue & preparation
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Phone number */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    {editingStaff ? 'New Password (Optional)' : 'Password'}
                  </label>
                  {editingStaff && (
                    <span className="text-[10px] text-stone-400">Leave blank to keep existing</span>
                  )}
                </div>
                <input
                  type="password"
                  required={!editingStaff}
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingStaff ? 'Enter new password if resetting...' : 'Minimum 6 characters'}
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Status on edit */}
              {editingStaff && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Account Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as StaffStatus })}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                  >
                    <option value="active">Active (Can log in)</option>
                    <option value="inactive">Inactive (Access suspended)</option>
                  </select>
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{editingStaff ? 'Save Changes' : 'Create Account'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-stone-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-900">Remove Staff Member?</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Are you sure you want to remove <strong className="text-stone-800">{deleteConfirmStaff.name}</strong>?
                This will revoke their access to the system.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmStaff(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStaff}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
