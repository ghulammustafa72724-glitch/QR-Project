import React from 'react';
import { Clock, ChefHat, CheckCircle2, CheckCheck, XCircle } from 'lucide-react';
import { OrderStatus } from '../types';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const normalizedStatus = status === 'served' ? 'completed' : status;

  const config = {
    pending: {
      label: 'Pending Approval',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200/80',
      icon: Clock,
      dotColor: 'bg-amber-500',
    },
    accepted: {
      label: 'Accepted',
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-200/80',
      icon: CheckCircle2,
      dotColor: 'bg-indigo-500',
    },
    preparing: {
      label: 'Preparing',
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      border: 'border-sky-200/80',
      icon: ChefHat,
      dotColor: 'bg-sky-500',
    },
    ready: {
      label: 'Ready to Serve',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200/80',
      icon: CheckCircle2,
      dotColor: 'bg-emerald-500',
    },
    completed: {
      label: 'Completed',
      bg: 'bg-stone-100',
      text: 'text-stone-700',
      border: 'border-stone-200',
      icon: CheckCheck,
      dotColor: 'bg-stone-400',
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200/80',
      icon: XCircle,
      dotColor: 'bg-rose-500',
    },
    rejected: {
      label: 'Rejected',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200/80',
      icon: XCircle,
      dotColor: 'bg-rose-500',
    },
  }[normalizedStatus] || {
    label: normalizedStatus,
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    border: 'border-stone-200',
    icon: Clock,
    dotColor: 'bg-stone-400',
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      {showIcon && <Icon className={`${iconSizes} shrink-0`} />}
      <span>{config.label}</span>
    </span>
  );
};
