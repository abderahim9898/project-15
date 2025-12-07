import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { useAuth, type Permission } from "@/contexts/AuthContext";

interface AdminLoginProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminLogin({ isOpen, onOpenChange }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isLoading, session } = useAuth();
  const navigate = useNavigate();

  const getAdminPath = (permission: Permission): string => {
    switch (permission) {
      case "SUPERADMIN":
        return "/admin/superadmin";
      case "POINTAGE":
        return "/admin/pointage";
      case "LABOURAL":
        return "/admin/laboural";
      default:
        return "/";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    try {
      await login(email, password);
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de la connexion",
      );
    }
  };

  useEffect(() => {
    if (session?.isAuthenticated && !isOpen) {
      navigate(getAdminPath(session.permission));
    }
  }, [session?.isAuthenticated, isOpen, navigate, session?.permission]);

  if (session?.isAuthenticated) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6 text-accent-foreground" />
              </div>
            </div>
            <DialogTitle className="text-center">Connecté</DialogTitle>
            <DialogDescription className="text-center">
              Vous êtes connecté en tant que {session.email}
              <br />
              Permission: {session.permission}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => {
                onOpenChange(false);
              }}
              className="flex-1"
            >
              Accéder au tableau de bord
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-accent-foreground" />
            </div>
          </div>
          <DialogTitle className="text-center">Connexion Admin</DialogTitle>
          <DialogDescription className="text-center">
            Entrez vos identifiants pour accéder au panneau d'administration
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Adresse e-mail
            </label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Connexion..." : "Se connecter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
