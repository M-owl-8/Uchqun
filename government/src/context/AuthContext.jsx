import { createContext, useContext } from 'react';
import { createAuthContext } from '@shared/context/createAuthContext';
import api from '../services/api';

const { AuthProvider: BaseAuthProvider, useAuth: useBaseAuth } = createAuthContext({
  tokenKey: 'government_accessToken',
  requiredRole: 'government',
  api,
});

const GovAuthContext = createContext(null);

// Thin bridge: reads the base context and adds government-specific derived state.
// Rendered as a child of BaseAuthProvider so useBaseAuth() is always available.
function GovAuthBridge({ children }) {
  const base = useBaseAuth();

  const govLevel = base.user?.govLevel ?? null;
  const govType = base.user?.govType ?? null;
  const govRegionId = base.user?.govRegionId ?? null;
  const govAccessGrants = base.user?.govAccessGrants ?? {};
  const mustChangePassword = base.user?.mustChangePassword === true;

  // Mirrors backend requireGovAccess: main always passes, secondary checks grants.
  function hasCapability(key) {
    if (govType === 'main') return true;
    return govAccessGrants[key] === true;
  }

  return (
    <GovAuthContext.Provider value={{
      ...base,
      govLevel,
      govType,
      govRegionId,
      govAccessGrants,
      mustChangePassword,
      hasCapability,
      isRepublic: govLevel === 'republic',
      isRegionAccount: govLevel === 'region',
    }}>
      {children}
    </GovAuthContext.Provider>
  );
}

export function AuthProvider({ children }) {
  return (
    <BaseAuthProvider>
      <GovAuthBridge>{children}</GovAuthBridge>
    </BaseAuthProvider>
  );
}

export function useAuth() {
  const ctx = useContext(GovAuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default GovAuthContext;
