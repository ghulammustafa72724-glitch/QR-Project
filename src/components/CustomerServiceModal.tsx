import React, { useState } from 'react';
import {
  Bell,
  Droplets,
  Receipt,
  Utensils,
  HelpCircle,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ServiceRequestType, ServiceRequest } from '../types';

interface CustomerServiceModalProps {
  restaurantId: string;
  tableId: string;
  tableNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (request: ServiceRequest) => void;
}

const SERVICE_OPTIONS: {
  type: ServiceRequestType;
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    type: 'call_waiter',
    title: 'Call Waiter',
    desc: 'General table assistance from a server',
    icon: <Bell className="w-5 h-5 text-rose-600" />,
    color: 'border-rose-200 bg-rose-50/50 hover:border-rose-400',
  },
  {
    type: 'water',
    title: 'Request Water',
    desc: 'Fresh water or cup refills for your table',
    icon: <Droplets className="w-5 h-5 text-cyan-600" />,
    color: 'border-cyan-200 bg-cyan-50/50 hover:border-cyan-400',
  },
  {
    type: 'bill',
    title: 'Request Bill / Check',
    desc: 'Ask your server to bring the check to table',
    icon: <Receipt className="w-5 h-5 text-emerald-600" />,
    color: 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-400',
  },
  {
    type: 'cutlery',
    title: 'Extra Cutlery & Napkins',
    desc: 'Forks, spoons, knives, or fresh napkins',
    icon: <Utensils className="w-5 h-5 text-amber-600" />,
    color: 'border-amber-200 bg-amber-50/50 hover:border-amber-400',
  },
  {
    type: 'assistance',
    title: 'Other Assistance',
    desc: 'Special request or questions about the menu',
    icon: <HelpCircle className="w-5 h-5 text-purple-600" />,
    color: 'border-purple-200 bg-purple-50/50 hover:border-purple-400',
  },
];

export const CustomerServiceModal: React.FC<CustomerServiceModalProps> = ({
  restaurantId,
  tableId,
  tableNumber,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedType, setSelectedType] = useState<ServiceRequestType>('call_waiter');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/public/r/${restaurantId}/t/${tableId}/service-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: selectedType,
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit service request.');
      }

      onSuccess(data.request);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to alert the staff. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-600 animate-swing" />
              Request Table Service
            </h3>
            <span className="text-xs text-stone-500 font-medium">Table {tableNumber}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700">What do you need assistance with?</label>
            <div className="space-y-2">
              {SERVICE_OPTIONS.map((opt) => (
                <div
                  key={opt.type}
                  onClick={() => setSelectedType(opt.type)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                    selectedType === opt.type
                      ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-xs'
                      : opt.color
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center shrink-0">
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-xs text-stone-900 block">{opt.title}</span>
                    <span className="text-[11px] text-stone-500 block leading-tight">{opt.desc}</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedType === opt.type
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-stone-300'
                    }`}
                  >
                    {selectedType === opt.type && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Additional Details <span className="text-stone-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              maxLength={200}
              placeholder="e.g. 2 glasses of ice water, or extra serviettes please..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Send Request to Staff
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
