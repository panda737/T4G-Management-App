import { useEffect, useRef } from 'react';

/**
 * While `active` is true, the device/browser Back button closes the overlay
 * (calls `onClose`) instead of navigating away from the page.
 *
 * It pushes a single same-URL history entry when the overlay opens, so:
 *  - pressing Back fires `popstate` → we call `onClose()` (the entry is consumed);
 *  - closing programmatically (button / Escape / overlay click) unmounts the
 *    overlay → we `history.back()` to remove the entry we added, keeping history
 *    balanced. The listener is removed first, so that back() never double-closes.
 *
 * The same URL is kept (`pushState('', '')`), so react-router's location never
 * changes and routing is untouched. `onClose` is read through a ref so passing a
 * fresh inline handler each render does not re-run the effect (which would push
 * duplicate entries).
 */
export function useBackClose(active: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;

    window.history.pushState({ __overlay: true }, '');
    let poppedByBack = false;

    const handlePop = () => {
      poppedByBack = true;
      onCloseRef.current();
    };
    window.addEventListener('popstate', handlePop);

    return () => {
      window.removeEventListener('popstate', handlePop);
      // Closed programmatically (not via Back) → drop the entry we pushed.
      if (!poppedByBack) {
        window.history.back();
      }
    };
  }, [active]);
}
