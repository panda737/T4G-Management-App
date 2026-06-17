import { useEffect, RefObject } from 'react';

// Calls `handler` when a pointer event lands outside `ref`. Used to close
// search dropdowns when the user clicks away. Disabled when `enabled` is false
// (e.g. the dropdown is already closed) so we don't keep idle global listeners.
export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    function onPointer(e: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (!el || el.contains(e.target as Node)) return;
      handler();
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [ref, handler, enabled]);
}
