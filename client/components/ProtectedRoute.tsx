import { Navigate } from "react-router-dom";
import { useAuth, type Permission } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission: Permission;
}

export default function ProtectedRoute({
  children,
  requiredPermission,
}: ProtectedRouteProps) {
  const { session } = useAuth();

  if (!session?.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous devez vous connecter pour accéder à cette page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (session.permission !== requiredPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Alert className="max-w-md border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Vous n'avez pas les permissions nécessaires pour accéder à cette
            page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
