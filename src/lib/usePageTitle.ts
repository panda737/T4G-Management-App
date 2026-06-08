import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Tech4Green`;
    return () => { document.title = 'Tech4Green'; };
  }, [title]);
}
