import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Package, Award, Truck } from 'lucide-react';

interface AlertBannerProps {
  openIncidents: number;
  overdueActions: number;
  outOfStockCount: number;
  expiringCertsCount: number;
  complianceExpiringCount: number;
}

export default function AlertBanner({ openIncidents, overdueActions, outOfStockCount, expiringCertsCount, complianceExpiringCount }: AlertBannerProps) {
  const navigate = useNavigate();

  const alerts = [
    openIncidents > 0 && {
      key: 'incidents',
      label: `${openIncidents} open incident${openIncidents !== 1 ? 's' : ''}`,
      Icon: AlertTriangle,
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-700',
      dot: 'bg-red-500',
      onClick: () => navigate('/safety/incidents'),
    },
    overdueActions > 0 && {
      key: 'actions',
      label: `${overdueActions} overdue action${overdueActions !== 1 ? 's' : ''}`,
      Icon: Clock,
      bg: 'bg-orange-50 border-orange-200',
      text: 'text-orange-700',
      dot: 'bg-orange-500',
      onClick: () => navigate('/safety/corrective-actions'),
    },
    outOfStockCount > 0 && {
      key: 'stock',
      label: `${outOfStockCount} item${outOfStockCount !== 1 ? 's' : ''} out of stock`,
      Icon: Package,
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      onClick: () => navigate('/stock/master-list'),
    },
    expiringCertsCount > 0 && {
      key: 'certs',
      label: `${expiringCertsCount} cert${expiringCertsCount !== 1 ? 's' : ''} expiring within 7 days`,
      Icon: Award,
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-700',
      dot: 'bg-amber-400',
      onClick: () => navigate('/training/certificates'),
    },
    complianceExpiringCount > 0 && {
      key: 'compliance',
      label: `${complianceExpiringCount} compliance doc${complianceExpiringCount !== 1 ? 's' : ''} expiring`,
      Icon: Truck,
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      onClick: () => navigate('/logistics/vehicles'),
    },
  ].filter(Boolean) as Array<{
    key: string; label: string; Icon: React.ElementType;
    bg: string; text: string; dot: string; onClick: () => void;
  }>;

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {alerts.map((a) => (
        <button
          key={a.key}
          onClick={a.onClick}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-opacity hover:opacity-75 ${a.bg} ${a.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.dot}`} />
          <a.Icon size={12} className="flex-shrink-0" />
          {a.label}
        </button>
      ))}
    </div>
  );
}
