import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { setAuthTokenGetter } from '@workspace/api-client-react';

interface AuthContextType {
  token: string | null;
  username: string | null;
  role: string | null;
  login: (token: string, username: string, role: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(localStorage.getItem('bsp_token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('bsp_username'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('bsp_role'));

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem('bsp_token'));
  }, []);

  const login = (newToken: string, newUsername: string, newRole: string) => {
    localStorage.setItem('bsp_token', newToken);
    localStorage.setItem('bsp_username', newUsername);
    localStorage.setItem('bsp_role', newRole);
    setTokenState(newToken);
    setUsername(newUsername);
    setRole(newRole);
  };

  const logout = () => {
    localStorage.removeItem('bsp_token');
    localStorage.removeItem('bsp_username');
    localStorage.removeItem('bsp_role');
    setTokenState(null);
    setUsername(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ token, username, role, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
