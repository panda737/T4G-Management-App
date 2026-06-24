import { useEffect, useRef } from 'react';

/**
 * While `active` is true, the device/browser Back button closes the overlay
 * (calls `onClose`) instead of navigating away from the page.
 *
 * On open it pushes a single same-URL history entry; pressing Back fires
 * `popstate`, which we turn into `onClose()`. We deliberately do NOT call
 * `history.back()` on programmatic close: doing so fires an extra `popstate`
 * that React StrictMode's dev mount→unmount→mount probe would deliver to the
 * freshly-mounted listener, instantly re-closing the overlay (a "flash"). The
 * trade-off is a harmless stale same-URL history entry after a button/Escape
 * close — pressing Back once then is a no-op before normal navigation resumes.
 *
 * Same-URL `pushState` keeps react-router's location unchanged, so routing is
 * untouched. `onClose` is read through a ref so a fresh inline handler each
 * render doesn't re-run the effect (which would push duplicate entries).
 */
export function useBackClose(active: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    window.history.pushState({ __overlay: true }, '');
    const handlePop = () => onCloseRef.current();
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [active]);
}
