interface StatusBadgeProps {
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    'In Stock': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    'Low Stock': 'bg-amber-100 text-amber-700 border border-amber-200',
    'Out of Stock': 'bg-red-100 text-red-700 border border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
