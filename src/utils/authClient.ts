import { AppUserAccount, UserPermissionKey } from '../types';

const TOKEN_STORAGE_KEY = 'kidzee_admin_token_v1';
const USER_STORAGE_KEY = 'kidzee_admin_user_v1';

export interface AdminUserInfo extends AppUserAccount {
  issuedAt: number;
  expiresAt: number;
}

export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getStoredAdminUser(): AdminUserInfo | null {
  try {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: AdminUserInfo): void {
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {}
}

export function updateStoredUser(user: AdminUserInfo): void {
  try {
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {}
}

export function clearAuthSession(): void {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
  } catch {}
}

export function hasUserPermission(
  user: AdminUserInfo | null | undefined,
  permission: UserPermissionKey
): boolean {
  if (!user) return false;
  if (user.isPrimaryAdmin || user.role === 'admin') return true;
  return Boolean(user.permissions?.[permission]);
}

export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Authenticated fetch wrapper that automatically injects the Bearer token,
 * includes cookies, and triggers a global lock event on HTTP 401 Unauthorized.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    clearAuthSession();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kidzee:unauthorized'));
    }
  }

  return response;
}

/**
 * Download a protected binary/script file cleanly using authFetch -> Blob -> ObjectURL.
 */
export async function downloadProtectedFile(url: string, fallbackFileName: string): Promise<void> {
  const res = await authFetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = fallbackFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
}
