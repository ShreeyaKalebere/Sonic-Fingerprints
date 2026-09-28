import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Store authentication purely in-memory per environment guidelines (NOT in localStorage)
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const login = useCallback((jwtToken, userData) => {
    setToken(jwtToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Wrapper around fetch that automatically injects the Authorization: Bearer <token> header.
   */
  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = new Headers(options.headers || {});
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(url, {
        ...options,
        headers
      });
    },
    [token]
  );

  const value = {
    token,
    user,
    isAuthenticated: !!token,
    login,
    logout,
    authFetch
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
