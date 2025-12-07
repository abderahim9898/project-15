import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Permission = "SUPERADMIN" | "POINTAGE" | "LABOURAL";

export interface AuthSession {
  email: string;
  permission: Permission;
  isAuthenticated: boolean;
}

interface AuthContextType {
  session: AuthSession | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedSession = localStorage.getItem("authSession");
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch (err) {
        localStorage.removeItem("authSession");
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/auth");

      if (!response.ok) {
        throw new Error("Unable to fetch authentication data from server");
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Unable to fetch authentication data");
      }

      const rows = data as Array<[string, string | number, string]>;
      const headers = rows[0];
      const emailIndex = headers.indexOf("EMAIL");
      const passwordIndex = headers.indexOf("PASS");
      const permissionIndex = headers.indexOf("ACCES");

      if (emailIndex === -1 || passwordIndex === -1 || permissionIndex === -1) {
        throw new Error("Invalid data structure from server");
      }

      const normalizedEmail = email.toLowerCase();
      const normalizedPassword = String(password);

      const user = rows.slice(1).find((row) => {
        const rowEmail = String(row[emailIndex]).toLowerCase();
        const rowPassword = String(row[passwordIndex]);
        return rowEmail === normalizedEmail && rowPassword === normalizedPassword;
      });

      if (!user) {
        throw new Error("Email ou mot de passe incorrect");
      }

      const permission = String(user[permissionIndex]) as Permission;

      if (!["SUPERADMIN", "POINTAGE", "LABOURAL"].includes(permission)) {
        throw new Error("Invalid permission type");
      }

      const newSession: AuthSession = {
        email: normalizedEmail,
        permission,
        isAuthenticated: true,
      };

      setSession(newSession);
      localStorage.setItem("authSession", JSON.stringify(newSession));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Authentication failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem("authSession");
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        login,
        logout,
        isLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
