import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api, errorMessage } from './api';
import { Modal } from './components/Modal';
import type { User } from './types';

interface GoogleIdentity {
  initialize: (options: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select: boolean;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: { theme: string; size: string; shape: string; width: number },
  ) => void;
  disableAutoSelect: () => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    api<{ user: User | null }>('/auth/me', { signal: controller.signal })
      .then((result) => setUser(result.user))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  const login = useCallback(async (credential: string) => {
    const result = await api<{ user: User }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    setUser(result.user);
    setError('');
  }, []);
  const devLogin = useCallback(async (persona: 'user' | 'admin') => {
    const result = await api<{ user: User }>('/auth/development', {
      method: 'POST',
      body: JSON.stringify({ persona }),
    });
    setUser(result.user);
    setError('');
  }, []);
  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST', body: '{}' });
      window.google?.accounts.id.disableAutoSelect();
      setUser(null);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };
  return { user, loading, error, login, devLogin, logout };
}

/** Google owns the branded button. Only the verified token travels to our session endpoint. */
export function SignIn({
  onClose,
  onSuccess,
  login,
  devLogin,
}: {
  onClose: () => void;
  onSuccess: () => void;
  login: (credential: string) => Promise<void>;
  devLogin: (persona: 'user' | 'admin') => Promise<void>;
}) {
  const button = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const development = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_AUTH === 'true';
  const successRef = useRef(onSuccess);
  successRef.current = onSuccess;
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !window.google || !button.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        callback: (response) => {
          setPending(true);
          void login(response.credential)
            .then(() => successRef.current())
            .catch((reason: unknown) => setError(errorMessage(reason)))
            .finally(() => setPending(false));
        },
      });
      window.google.accounts.id.renderButton(button.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width: 300,
      });
    };
    if (window.google) {
      render();
      return;
    }
    let script = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.dataset.googleIdentity = 'true';
      document.head.appendChild(script);
    }
    const fail = () =>
      setError('Google Sign-In could not load. Check your connection and try again.');
    script.addEventListener('load', render);
    script.addEventListener('error', fail);
    return () => {
      cancelled = true;
      script.removeEventListener('load', render);
      script.removeEventListener('error', fail);
    };
  }, [clientId, login]);
  const fixture = async (persona: 'user' | 'admin') => {
    setPending(true);
    try {
      await devLogin(persona);
      onSuccess();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  };
  return (
    <Modal title="A local perspective starts with you" onClose={onClose}>
      <div className="signin-content">
        <span className="feature-icon">
          <ShieldCheck size={30} />
        </span>
        <p>Sign in to share a place you know. Everyone can explore the map without an account.</p>
        <div ref={button} className="google-button" />
        {!clientId && (
          <p className="notice">
            Google Sign-In is not configured for this deployment yet. You can still explore
            community reports.
          </p>
        )}
        {pending && <p role="status">Signing you in…</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <p className="muted small">
          Only your public display name appears with your experiences. Your email is never public.
        </p>
        {development && (
          <div className="dev-auth">
            <strong>Local development only</strong>
            <button
              className="button secondary"
              disabled={pending}
              onClick={() => void fixture('user')}
            >
              Continue as test user
            </button>
            <button
              className="button secondary"
              disabled={pending}
              onClick={() => void fixture('admin')}
            >
              Continue as test admin
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
