import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Plus,
  Edit2,
  Trash2,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  Store,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RestaurantTable } from '../types';
import {
  generateQRCodeDataUrl,
  getPublicTableUrl,
  downloadQRCode,
} from '../utils/qr';

export const TablesView: React.FC = () => {
  const { token, restaurant } = useAuth();

  // State
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [restaurantName, setRestaurantName] = useState(restaurant?.name || 'Restaurant');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cached QR data URLs mapped by table.id
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});

  // Add / Edit Modal state
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [tableNumber, setTableNumber] = useState('');
  const [displayLabel, setDisplayLabel] = useState('');
  const [tableActive, setTableActive] = useState(true);

  // QR Code Viewer Modal state
  const [activeQRTable, setActiveQRTable] = useState<RestaurantTable | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Print Mode Modal state
  const [printTable, setPrintTable] = useState<RestaurantTable | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<RestaurantTable | null>(null);

  // Regenerate confirmation state
  const [regenerateTarget, setRegenerateTarget] = useState<RestaurantTable | null>(null);

  const fetchTables = async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/tables', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to load restaurant tables.');
      } else {
        const loadedTables: RestaurantTable[] = data.tables || [];
        setTables(loadedTables);
        if (data.restaurantName) {
          setRestaurantName(data.restaurantName);
        }

        // Generate QR codes in background for all tables
        const qrMap: Record<string, string> = {};
        for (const t of loadedTables) {
          const url = getPublicTableUrl(t.restaurant_id, t.id);
          qrMap[t.id] = await generateQRCodeDataUrl(url, { width: 400 });
        }
        setQrDataUrls(qrMap);
      }
    } catch (err) {
      console.error('Error loading tables:', err);
      setErrorMessage('Connection error while fetching tables.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [token]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Open Add Table modal
  const handleOpenAddTable = () => {
    setEditingTable(null);
    setTableNumber('');
    setDisplayLabel('');
    setTableActive(true);
    setIsTableModalOpen(true);
  };

  // Open Edit Table modal
  const handleOpenEditTable = (table: RestaurantTable) => {
    setEditingTable(table);
    setTableNumber(table.table_number);
    setDisplayLabel(table.display_label || '');
    setTableActive(table.is_active === 1);
    setIsTableModalOpen(true);
  };

  // Save Table (Create or Edit)
  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) {
      setErrorMessage('Table number or name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const url = editingTable ? `/api/tables/${editingTable.id}` : '/api/tables';
      const method = editingTable ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          table_number: tableNumber.trim(),
          display_label: displayLabel.trim(),
          is_active: tableActive ? 1 : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to save table.');
      } else {
        showSuccess(editingTable ? 'Table updated successfully.' : 'Table created successfully.');
        setIsTableModalOpen(false);
        fetchTables();
      }
    } catch (err) {
      setErrorMessage('Connection error while saving table.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Table Active Status
  const handleToggleStatus = async (table: RestaurantTable) => {
    const newStatus = table.is_active === 1 ? 0 : 1;

    // Optimistic UI update
    setTables((prev) =>
      prev.map((t) => (t.id === table.id ? { ...t, is_active: newStatus } : t))
    );

    try {
      const res = await fetch(`/api/tables/${table.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        fetchTables(); // Rollback
        setErrorMessage(data.error || 'Failed to update table status.');
      } else {
        showSuccess(`"${table.table_number}" marked as ${newStatus ? 'active' : 'inactive'}.`);
      }
    } catch (err) {
      fetchTables();
    }
  };

  // Confirm Delete Table
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/tables/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to delete table.');
      } else {
        showSuccess(`Table "${deleteTarget.table_number}" deleted successfully.`);
        if (activeQRTable?.id === deleteTarget.id) {
          setActiveQRTable(null);
        }
        fetchTables();
      }
    } catch (err) {
      setErrorMessage('Error connecting to server.');
    } finally {
      setIsSubmitting(false);
      setDeleteTarget(null);
    }
  };

  // Regenerate QR Code
  const handleConfirmRegenerate = async () => {
    if (!regenerateTarget) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/tables/${regenerateTarget.id}/regenerate-qr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to regenerate QR code.');
      } else {
        showSuccess(`QR Code regenerated for ${regenerateTarget.table_number}.`);
        if (activeQRTable?.id === regenerateTarget.id) {
          setActiveQRTable(data.table);
        }
        fetchTables();
      }
    } catch (err) {
      setErrorMessage('Connection error while regenerating QR.');
    } finally {
      setIsSubmitting(false);
      setRegenerateTarget(null);
    }
  };

  // Copy Public Table URL
  const handleCopyLink = (table: RestaurantTable) => {
    const url = getPublicTableUrl(table.restaurant_id, table.id);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Download QR Code
  const handleDownloadQR = async (table: RestaurantTable) => {
    let dataUrl = qrDataUrls[table.id];
    if (!dataUrl) {
      const url = getPublicTableUrl(table.restaurant_id, table.id);
      dataUrl = await generateQRCodeDataUrl(url, { width: 800 });
    }
    downloadQRCode(dataUrl, restaurantName, table.table_number);
    showSuccess(`Downloaded QR code for ${table.table_number}.`);
  };

  // Print QR Code
  const handlePrint = (table: RestaurantTable) => {
    setPrintTable(table);
  };

  const activeCount = tables.filter((t) => t.is_active === 1).length;
  const inactiveCount = tables.length - activeCount;

  return (
    <div className="max-w-6xl w-full mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/50">
              <QrCode className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Table Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-500">
            Create and manage your restaurant tables and their unique QR codes.
          </p>
        </div>

        <button
          onClick={handleOpenAddTable}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Table</span>
        </button>
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
            Total Tables
          </span>
          <span className="text-xl sm:text-2xl font-bold text-stone-900 mt-0.5 block">
            {tables.length}
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-3.5 sm:p-4">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Active Tables
          </span>
          <span className="text-xl sm:text-2xl font-bold text-emerald-600 mt-0.5 block">
            {activeCount}
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-3.5 sm:p-4">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Inactive
          </span>
          <span className="text-xl sm:text-2xl font-bold text-stone-500 mt-0.5 block">
            {inactiveCount}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-16 text-center bg-white border border-stone-200 rounded-2xl">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-stone-600">Loading tables & QR codes...</p>
        </div>
      ) : tables.length === 0 ? (
        /* Empty State: No Tables Created Yet */
        <div className="bg-white border border-dashed border-stone-300 rounded-2xl p-8 sm:p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 border border-amber-200/60 rounded-2xl mx-auto flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900">
              No tables have been created yet
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Add your physical restaurant tables (e.g. Table 1, Table 2, Patio 4) to automatically generate their unique QR ordering destinations.
            </p>
          </div>
          <button
            onClick={handleOpenAddTable}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Table</span>
          </button>
        </div>
      ) : (
        /* Tables Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => {
            const isActive = table.is_active === 1;
            const qrUrl = qrDataUrls[table.id];

            return (
              <div
                key={table.id}
                className={`bg-white border rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${
                  isActive ? 'border-stone-200' : 'border-stone-200 opacity-80 bg-stone-50/50'
                }`}
              >
                <div>
                  {/* Top: Table Title & Active status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-stone-900 tracking-tight">
                        {table.table_number}
                      </h3>
                      {table.display_label ? (
                        <p className="text-xs text-stone-500">{table.display_label}</p>
                      ) : (
                        <p className="text-xs text-stone-400 italic">No custom label</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleToggleStatus(table)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors border ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200/60'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border-stone-200'
                      }`}
                      title="Click to toggle status"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isActive ? 'bg-emerald-500' : 'bg-stone-400'
                        }`}
                      />
                      <span>{isActive ? 'Active' : 'Inactive'}</span>
                    </button>
                  </div>

                  {/* QR Preview Card */}
                  <div
                    onClick={() => setActiveQRTable(table)}
                    className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer flex items-center gap-3.5 mb-4 group"
                  >
                    <div className="w-16 h-16 bg-white border border-stone-200 rounded-lg p-1 shrink-0 flex items-center justify-center overflow-hidden">
                      {qrUrl ? (
                        <img
                          src={qrUrl}
                          alt={`QR for ${table.table_number}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <QrCode className="w-6 h-6 text-stone-400 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-stone-800 group-hover:text-amber-800 block truncate">
                        Unique QR Code
                      </span>
                      <span className="text-[11px] text-stone-500 block truncate">
                        Click to view, print or scan
                      </span>
                      <span className="text-[10px] text-amber-700 font-semibold group-hover:underline inline-block mt-0.5">
                        Inspect QR Details →
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setActiveQRTable(table)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg transition-colors flex items-center gap-1"
                      title="View QR Code"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    <button
                      onClick={() => handleDownloadQR(table)}
                      className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                      title="Download QR image (PNG)"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handlePrint(table)}
                      className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                      title="Print Table Tent QR"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditTable(table)}
                      className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                      title="Edit Table Info"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeleteTarget(table)}
                      className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Table"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 1: ADD / EDIT TABLE */}
      {/* ========================================== */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h2 className="text-base font-bold text-stone-900">
                {editingTable ? 'Edit Table Information' : 'Add New Restaurant Table'}
              </h2>
              <button
                onClick={() => setIsTableModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="tbl-name">
                  Table Number or Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="tbl-name"
                  type="text"
                  required
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. Table 1, Booth 4, Patio 2, VIP Table"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Unique identifier used by staff and guests inside your restaurant.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="tbl-label">
                  Display Label (Optional)
                </label>
                <input
                  id="tbl-label"
                  type="text"
                  value={displayLabel}
                  onChange={(e) => setDisplayLabel(e.target.value)}
                  placeholder="e.g. Near Window, 4 Seats, Balcony View"
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-semibold text-stone-700 block">Table Active</span>
                  <span className="text-[11px] text-stone-400">Available for QR scanning and dining</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tableActive}
                    onChange={(e) => setTableActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(false)}
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
                    <span>{editingTable ? 'Update Table' : 'Create Table'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: VIEW & INSPECT QR CODE */}
      {/* ========================================== */}
      {activeQRTable && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-sm w-full p-6 shadow-xl animate-in zoom-in-95 duration-150 text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Table QR Identity
              </span>
              <button
                onClick={() => setActiveQRTable(null)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs font-medium text-stone-500">{restaurantName}</p>
              <h3 className="text-xl font-extrabold text-stone-900 mt-0.5">
                {activeQRTable.table_number}
              </h3>
              {activeQRTable.display_label && (
                <p className="text-xs text-stone-500 mt-0.5">{activeQRTable.display_label}</p>
              )}
            </div>

            {/* QR Code Container */}
            <div className="p-4 bg-white border-2 border-stone-200 rounded-2xl shadow-xs inline-block mx-auto">
              {qrDataUrls[activeQRTable.id] ? (
                <img
                  src={qrDataUrls[activeQRTable.id]}
                  alt={`QR code for ${activeQRTable.table_number}`}
                  className="w-48 h-48 mx-auto object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                </div>
              )}
            </div>

            {/* Public Destination URL display */}
            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-left text-xs space-y-1">
              <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
                Public QR Destination URL
              </span>
              <div className="flex items-center justify-between gap-1">
                <span className="text-stone-800 font-mono text-[11px] truncate flex-1">
                  {getPublicTableUrl(activeQRTable.restaurant_id, activeQRTable.id)}
                </span>
                <button
                  onClick={() => handleCopyLink(activeQRTable)}
                  className="p-1 text-stone-500 hover:text-stone-900 rounded shrink-0"
                  title="Copy link"
                >
                  {copiedLink ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Actions: Download, Print, Test Public URL */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleDownloadQR(activeQRTable)}
                className="py-2 px-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-stone-600" />
                <span>Download PNG</span>
              </button>

              <button
                onClick={() => handlePrint(activeQRTable)}
                className="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print QR Card</span>
              </button>
            </div>

            {/* Test Link to Open Public Scan Page in new tab */}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
              <a
                href={`/r/${activeQRTable.restaurant_id}/t/${activeQRTable.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-stone-600 hover:text-stone-900 flex items-center gap-1 text-[11px] font-medium"
              >
                <span>Simulate Phone Scan</span>
                <ExternalLink className="w-3 h-3 text-stone-400" />
              </a>

              <button
                onClick={() => setRegenerateTarget(activeQRTable)}
                className="text-[11px] text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1"
                title="Regenerate QR token"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Regenerate QR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 3: PRINTABLE TABLE TENT CARD */}
      {/* ========================================== */}
      {printTable && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl text-center space-y-5 print:p-0 print:border-none print:shadow-none">
            <div className="space-y-1">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white mx-auto flex items-center justify-center shadow-xs mb-2">
                <Store className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                {restaurantName}
              </h2>
              <div className="inline-block px-3 py-1 bg-stone-900 text-white rounded-lg text-sm font-extrabold tracking-wider uppercase mt-1">
                {printTable.table_number}
              </div>
              {printTable.display_label && (
                <p className="text-xs text-stone-500">{printTable.display_label}</p>
              )}
            </div>

            {/* Print QR Code */}
            <div className="p-4 bg-white border-2 border-stone-900 rounded-2xl inline-block mx-auto">
              <img
                src={qrDataUrls[printTable.id]}
                alt={`QR code for ${printTable.table_number}`}
                className="w-52 h-52 mx-auto object-contain"
              />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-stone-900">
                Scan to open the restaurant menu
              </p>
              <p className="text-xs text-stone-500">
                Point your smartphone camera at this QR code
              </p>
            </div>

            {/* Print Dialog Buttons (hidden during printing) */}
            <div className="pt-4 border-t border-stone-200 flex items-center justify-center gap-3 print:hidden">
              <button
                onClick={() => setPrintTable(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 4: CONFIRM DELETE */}
      {/* ========================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h2 className="text-base font-bold text-stone-900">
                Delete Table {deleteTarget.table_number}?
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                Are you sure you want to delete <span className="font-semibold text-stone-900">"{deleteTarget.table_number}"</span>? The associated QR code will be permanently removed.
              </p>
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

      {/* ========================================== */}
      {/* MODAL 5: CONFIRM REGENERATE QR */}
      {/* ========================================== */}
      {regenerateTarget && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>

            <div>
              <h2 className="text-base font-bold text-stone-900">
                Regenerate QR Code?
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
                Regenerating this QR will <span className="font-semibold text-rose-600">invalidate the previous QR code</span> for {regenerateTarget.table_number}. Any previously printed table card will stop working. Continue?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRegenerateTarget(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmRegenerate}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>Regenerating...</span>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate QR</span>
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
