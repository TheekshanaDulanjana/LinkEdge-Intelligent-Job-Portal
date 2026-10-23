import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;         // e.g. 12.2 or -4
  changeLabel?: string;    // e.g. "this week"
  iconColor?: string;
}

export default function StatCard({ label, value, icon: Icon, change, changeLabel, iconColor = 'indigo' }: Props) {
  const positive = (change ?? 0) >= 0;
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[iconColor]}`}>
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        {change !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full
            ${positive ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
            {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}{changeLabel ? ` · ${changeLabel}` : ''}</p>
    </div>
  );
}