interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'emerald' | 'gray' | 'orange';
  className?: string;
}

const sizeMap = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
const colorMap = { emerald: 'border-emerald-600', gray: 'border-gray-400', orange: 'border-orange-500' };

export function Spinner({ size = 'md', color = 'emerald', className = '' }: SpinnerProps) {
  return (
    <div className={`animate-spin rounded-full border-2 border-transparent ${sizeMap[size]} ${colorMap[color]} border-b-current ${className}`} />
  );
}

/** Full-page or section loading state */
export function PageSpinner({
  color = 'emerald',
  layout = 'py',
}: {
  color?: SpinnerProps['color'];
  layout?: 'py' | 'h64';
}) {
  const wrapper = layout === 'h64'
    ? 'flex items-center justify-center h-64'
    : 'flex justify-center py-16';
  return (
    <div className={wrapper}>
      <Spinner size="lg" color={color} />
    </div>
  );
}
