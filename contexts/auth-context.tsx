"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { authApi, siteApi } from "@/lib/api/services";
import {
  clearSession,
  getRefreshToken,
  getStoredUser,
  getTokenPair,
  setSession,
  setStoredUser,
  setTokenPair
} from "@/lib/api/token-store";
import type { LoginResponse, SiteBasicConfig, User } from "@/lib/api/types";
import { formatSiteName } from "@/lib/utils";

interface AuthContextValue {
  user: User | null;
  site: SiteBasicConfig | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  saveSession: (session: LoginResponse) => void;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

function isRealUser(user?: User | null): user is User {
  return Boolean(user && !user.anonymous);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = React.useState<User | null>(null);
  const [site, setSite] = React.useState<SiteBasicConfig | null>(null);
  const [hasToken, setHasToken] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();

  const saveSession = React.useCallback((session: LoginResponse) => {
    setSession(session);
    setUserState(session.user);
    setHasToken(true);
  }, []);

  const setUser = React.useCallback((nextUser: User) => {
    setStoredUser(nextUser);
    setUserState(nextUser);
  }, []);

  const refreshSession = React.useCallback(async () => {
    const token = getTokenPair();
    if (!token?.refresh_token) {
      setUserState(null);
      return;
    }

    const refreshed = await authApi.refresh(token.refresh_token);
    setTokenPair(refreshed);
  }, []);

  const signOut = React.useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        const redirectUrl = await authApi.signOut();
        if (redirectUrl) {
          window.location.href = redirectUrl;
          return;
        }
      }
    } finally {
      clearSession();
      setUserState(null);
      router.replace("/login");
    }
  }, [router]);

  React.useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const stored = getStoredUser();
        const token = getTokenPair();
        if (mounted) {
          setHasToken(Boolean(token));
          setUserState(token ? stored : null);
        }
      } catch {
        if (mounted) {
          setHasToken(false);
          setUserState(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }

      try {
        const siteConfig = await siteApi.config<SiteBasicConfig>("basic", { timeoutMs: 8000 });
        if (!mounted) {
          return;
        }
        setSite(siteConfig);
        document.title = formatSiteName(siteConfig.title);
        const siteUser = siteConfig.user;
        if (isRealUser(siteUser)) {
          setUserState(siteUser);
          setStoredUser(siteUser);
        }
      } catch {
        // Site config is optional for custom deployments; authenticated pages will still call their own APIs.
      }
    }

    boot();
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    const onLogout = () => {
      setHasToken(false);
      setUserState(null);
    };
    const onSession = () => setHasToken(Boolean(getTokenPair()));
    const onToken = () => setHasToken(Boolean(getTokenPair()));
    const onUser = (event: Event) => setUserState((event as CustomEvent<User>).detail);
    window.addEventListener("cloudreve:logout", onLogout);
    window.addEventListener("cloudreve:session", onSession);
    window.addEventListener("cloudreve:token", onToken);
    window.addEventListener("cloudreve:user", onUser);
    return () => {
      window.removeEventListener("cloudreve:logout", onLogout);
      window.removeEventListener("cloudreve:session", onSession);
      window.removeEventListener("cloudreve:token", onToken);
      window.removeEventListener("cloudreve:user", onUser);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        site,
        isAuthenticated: Boolean(isRealUser(user) || hasToken),
        isLoading,
        setUser,
        saveSession,
        signOut,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const loginTarget = `/login?next=${encodeURIComponent(pathname)}`;
  const [loadingExpired, setLoadingExpired] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading) {
      setLoadingExpired(false);
      return;
    }

    const timer = window.setTimeout(() => setLoadingExpired(true), 1200);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  React.useEffect(() => {
    if ((!isLoading || loadingExpired) && !isAuthenticated) {
      router.replace(loginTarget);
    }
  }, [isAuthenticated, isLoading, loadingExpired, loginTarget, router]);

  React.useEffect(() => {
    if ((!isLoading || loadingExpired) && !isAuthenticated) {
      const timer = window.setTimeout(() => {
        if (window.location.pathname !== "/login") {
          window.location.replace(loginTarget);
        }
      }, 100);

      return () => window.clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, loadingExpired, loginTarget]);

  if (isLoading && !loadingExpired) {
    return (
      <div className="page-enter flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        正在加载...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-enter flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        正在前往登录页...
        <Link className="ml-2 text-primary underline-offset-4 hover:underline" href={loginTarget}>
          立即登录
        </Link>
      </div>
    );
  }

  return children;
}
