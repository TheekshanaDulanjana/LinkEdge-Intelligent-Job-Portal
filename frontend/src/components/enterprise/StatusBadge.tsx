const STATUS_STYLES: Record<string, string> = {
  ACTIVE:   'bg-green-50 text-green-700 border-green-100',
  INACTIVE: 'bg-gray-100 text-gray-500 border-gray-200',
  CLOSED:   'bg-red-50 text-red-600 border-red-100',
  DRAFT:    'bg-amber-50 text-amber-600 border-amber-100',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active', INACTIVE: 'Inactive', CLOSED: 'Closed', DRAFT: 'Draft',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border
      ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}