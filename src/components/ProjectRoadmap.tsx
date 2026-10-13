import React from 'react';
import { Check, Clock, CircleDot } from 'lucide-react';
import { ProjectPart } from '../types';

const ROADMAP_PARTS: ProjectPart[] = [
  {
    partNumber: 1,
    title: 'Project Setup & First Working Screen',
    description: 'Clean foundation, modern stack setup, verified startup & responsiveness.',
    status: 'completed',
  },
  {
    partNumber: 2,
    title: 'Authentication & Restaurant Admin Foundation',
    description: 'Owner registration, secure login, hashed passwords, JWT sessions, restaurant profile & dashboard.',
    status: 'completed',
  },
  {
    partNumber: 3,
    title: 'Digital Menu & Food Management',
    description: 'Categories, food items, pricing, photos, stock availability toggles, and safe deletion.',
    status: 'completed',
  },
  {
    partNumber: 4,
    title: 'Restaurant Tables & QR-Code System',
    description: 'Physical table assignment, unique stable QR codes, high-res PNG download, and printable table tent cards.',
    status: 'completed',
  },
  {
    partNumber: 5,
    title: 'Customer Digital Menu & Ordering System',
    description: 'Mobile-first customer menu browsing, category navigation, item detail customizer, persistent cart, server-validated atomic ordering, and confirmation.',
    status: 'completed',
  },
  {
    partNumber: 6,
    title: 'Order Management & Kitchen Dashboard',
    description: 'Restaurant order management, order filtering & details, order status progression, and dedicated Kitchen Display System (KDS).',
    status: 'completed',
  },
  {
    partNumber: 7,
    title: 'Waiter/Staff System & Real-Time Updates',
    description: 'Staff account management (Waiter & Kitchen roles), RBAC permissions, Waiter Station dashboard, table service workflow, guest assistance calls, and live WebSocket real-time synchronization.',
    status: 'completed',
  },
  {
    partNumber: 8,
    title: 'Payments & Billing',
    description: 'Digital bill generation, payment status tracking, and receipt issuance.',
    status: 'planned',
  },
  {
    partNumber: 9,
    title: 'Reports, Settings & Advanced Features',
    description: 'Sales summaries, peak hours analytics, restaurant preferences, and tax config.',
    status: 'planned',
  },
  {
    partNumber: 10,
    title: 'Testing, Security, Deployment & Final Polishing',
    description: 'Comprehensive end-to-end verification, performance tuning, and launch audit.',
    status: 'planned',
  },
];

export const ProjectRoadmap: React.FC = () => {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-stone-900">Project Development Plan</h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Step-by-step phased architecture (10 parts)
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-medium text-stone-600 bg-stone-100 px-2.5 py-1 rounded-md">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Phase 6 of 10 ready</span>
        </div>
      </div>

      <div className="divide-y divide-stone-100">
        {ROADMAP_PARTS.map((part) => {
          const isDone = part.status === 'completed';
          return (
            <div
              key={part.partNumber}
              className={`p-4 sm:p-5 flex items-start gap-3.5 transition-colors ${
                isDone ? 'bg-emerald-50/40' : 'bg-white hover:bg-stone-50/50'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold mt-0.5 ${
                  isDone
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-500 border border-stone-200'
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : part.partNumber}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                    Part {part.partNumber}
                  </span>
                  <span className="text-stone-300">•</span>
                  <h3
                    className={`text-sm font-semibold ${
                      isDone ? 'text-stone-900' : 'text-stone-700'
                    }`}
                  >
                    {part.title}
                  </h3>
                  {isDone && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 ml-auto">
                      Completed
                    </span>
                  )}
                  {!isDone && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-600 ml-auto">
                      <Clock className="w-3 h-3" />
                      Awaiting Next Step
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                  {part.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
