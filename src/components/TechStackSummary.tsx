import React from 'react';
import { Layers, ShieldCheck, Zap, Smartphone, Server } from 'lucide-react';

export const TechStackSummary: React.FC = () => {
  const stackItems = [
    {
      icon: <Layers className="w-4 h-4 text-amber-600" />,
      label: 'Frontend Framework',
      value: 'React 19 + TypeScript + Vite',
      desc: 'High performance, modern ESM tooling, type safety',
    },
    {
      icon: <Smartphone className="w-4 h-4 text-blue-600" />,
      label: 'UI & Styling',
      value: 'Tailwind CSS v4',
      desc: 'Utility-first responsive design for mobile & desktop',
    },
    {
      icon: <Server className="w-4 h-4 text-emerald-600" />,
      label: 'Backend & Server Ready',
      value: 'Node.js / Express Architecture',
      desc: 'Scalable REST & real-time socket readiness',
    },
    {
      icon: <ShieldCheck className="w-4 h-4 text-indigo-600" />,
      label: 'Environment Health',
      value: 'Zero Build & Runtime Errors',
      desc: 'Clean compilation with strict TypeScript checks',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {stackItems.map((item, idx) => (
        <div
          key={idx}
          className="p-4 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-lg bg-stone-50 border border-stone-100">
              {item.icon}
            </div>
            <div>
              <p className="text-xs font-medium text-stone-500">{item.label}</p>
              <h4 className="text-sm font-semibold text-stone-900">{item.value}</h4>
            </div>
          </div>
          <p className="text-xs text-stone-500 pl-0.5">{item.desc}</p>
        </div>
      ))}
    </div>
  );
};
