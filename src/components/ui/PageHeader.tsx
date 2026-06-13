import { accent, type Accent } from './accents';

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  /** lucide icon shown in an accent chip to the left of the title. */
  icon?: React.ElementType;
  /** Right-aligned action buttons. */
  actions?: React.ReactNode;
  accent?: Accent;
}

/** App-wide page header matching the CRM "Accounts" look. */
export default function PageHeader({ title, subtitle, icon: Icon, actions, accent: a = 'indigo' }: PageHeaderProps) {
  const ac = accent(a);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ac.iconBg}`}>
            <Icon size={20} className={ac.iconText} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
