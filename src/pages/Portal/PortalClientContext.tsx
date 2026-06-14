import { createContext, useContext } from 'react';

export interface PortalClientValue {
  /** Active client to show. null = rely on RLS scoping (a real customer login). */
  clientId: string | null;
  /** Active site to scope to (admin preview only). null = whole account. */
  siteId: string | null;
  /** True when the login/preview is restricted to a single site (hides ESG). */
  siteScoped: boolean;
  /** True when an admin is previewing the portal as a specific client/site. */
  adminPreview: boolean;
}

export const PortalClientContext = createContext<PortalClientValue>({
  clientId: null, siteId: null, siteScoped: false, adminPreview: false,
});

export const usePortalClient = () => useContext(PortalClientContext);
