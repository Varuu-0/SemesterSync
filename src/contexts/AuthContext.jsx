import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'semestersync_user';

/**
 * Decode a JWT token payload (Google ID token)
 */
function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if the stored session is still valid (tokens expire)
        if (parsed && parsed.exp && parsed.exp * 1000 > Date.now()) {
          setUser(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  const handleCredentialResponse = useCallback((response) => {
    const decoded = decodeJwt(response.credential);
    if (decoded) {
      const userData = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        givenName: decoded.given_name,
        familyName: decoded.family_name,
        picture: decoded.picture,
        exp: decoded.exp,
        idToken: response.credential,
      };
      setUser(userData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    }
  }, []);

  const initializeGoogleSignIn = useCallback((buttonElement) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId || clientId === 'YOUR_CLIENT_ID_HERE') {
      console.warn(
        'Google OAuth Client ID not configured. Set VITE_GOOGLE_CLIENT_ID in .env file.'
      );
      return;
    }

    if (typeof google === 'undefined' || !google.accounts) {
      // Retry after script loads
      setTimeout(() => initializeGoogleSignIn(buttonElement), 500);
      return;
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    if (buttonElement) {
      google.accounts.id.renderButton(buttonElement, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        logo_alignment: 'left',
        width: 300,
      });
    }
  }, [handleCredentialResponse]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    // Revoke the Google session
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.disableAutoSelect();
    }
  }, []);

  const getCalendarAccessToken = useCallback(() => {
    return new Promise((resolve, reject) => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId || clientId === 'YOUR_CLIENT_ID_HERE') {
        return reject(new Error('Google OAuth Client ID not configured.'));
      }
      
      if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
        return reject(new Error('Google Identity Services not loaded.'));
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar.events',
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.access_token);
          }
        },
      });
      client.requestAccessToken();
    });
  }, []);

  // For dev/demo mode — skip OAuth entirely
  const loginAsGuest = useCallback(() => {
    const guestUser = {
      id: 'guest',
      email: 'guest@semestersync.dev',
      name: 'Guest User',
      givenName: 'Guest',
      familyName: 'User',
      picture: null,
      exp: Math.floor(Date.now() / 1000) + 86400, // 24h from now
      isGuest: true,
    };
    setUser(guestUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(guestUser));
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    initializeGoogleSignIn,
    logout,
    loginAsGuest,
    getCalendarAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
