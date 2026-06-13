import { type ButtonHTMLAttributes } from 'react';
import { accent, type Accent } from './accents';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  accent?: Accent;
  icon?: React.ElementType;
  /** Hide the label on small screens (icon stays). */
  hideLabelOnMobile?: boolean;
}

const BASE = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none';

/** App-wide button matching the CRM look. `primary` uses the module accent. */
export default function Button({
  variant = 'secondary', accent: a = 'indigo', icon: Icon, hideLabelOnMobile,
  className = '', children, ...rest
}: ButtonProps) {
  const ac = accent(a);
  const styles: Record<Variant, string> = {
    primary: `${ac.solid} shadow-sm`,
    secondary: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm',
    ghost: 'text-gray-600 hover:bg-gray-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  };
  return (
    <button className={`${BASE} ${styles[variant]} ${className}`} {...rest}>
      {Icon && <Icon size={15} className="flex-shrink-0" />}
      {children && <span className={hideLabelOnMobile ? 'hidden sm:inline' : ''}>{children}</span>}
    </button>
  );
}
