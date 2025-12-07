import { ReactNode, useState, useEffect } from "react";
import { Moon, Sun, Lock } from "lucide-react";
import AdminLogin from "@/components/AdminLogin";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isDark, setIsDark] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  useEffect(() => {
    // Check if dark mode is already set in localStorage or system preference
    const isDarkMode =
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(isDarkMode);
    updateTheme(isDarkMode);
  }, []);

  const updateTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    updateTheme(!isDark);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AdminLogin
        isOpen={isAdminLoginOpen}
        onOpenChange={setIsAdminLoginOpen}
      />
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-lg">
                  HR
                </span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">
                  Tableau de bord RH
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Système de gestion des ressources humaines
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsAdminLoginOpen(true)}
                variant="ghost"
                size="icon"
                aria-label="Admin"
                title="Accès Admin"
              >
                <Lock className="w-5 h-5 text-primary" />
              </Button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Basculer le thème"
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-accent" />
                ) : (
                  <Moon className="w-5 h-5 text-primary" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {children}
      </main>

      <footer className="border-t border-border bg-background mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <p className="text-center text-sm text-muted-foreground">
            © 2025 Tous droits réservés. Tableau de bord RH.
          </p>
        </div>
      </footer>
    </div>
  );
}
