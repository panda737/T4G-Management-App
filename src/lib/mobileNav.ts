import { createContext, useContext } from 'react';

/**
 * Lets descendant pages open the mobile navigation drawer that StaffShell owns
 * (the same drawer the top hamburger opens). Defaults to a no-op so consuming
 * outside the provider is harmless.
 */
export const OpenNavContext = createContext<() => void>(() => {});
export const useOpenNav = () => useContext(OpenNavContext);
