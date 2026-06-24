import { Menu } from 'lucide-react';
import { useOpenNav } from '../lib/mobileNav';

/**
 * Compact, mobile-only button that opens the navigation drawer (the same drawer
 * the top hamburger opens). Handy on operator-facing pages where the menu isn't
 * obvious. Hidden on lg+ where the sidebar is always visible.
 */
export default function MobileNavButton({ className = '' }: { className?: string }) {
  const openNav = useOpenNav();
  return (
    <button
      onClick={openNav}
      aria-label="Open menu"
      className={`lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors ${className}`}
    >
      <Menu size={16} /> Menu
    </button>
  );
}
