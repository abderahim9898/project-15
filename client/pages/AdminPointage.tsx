import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogOut, Clock, FileUp } from "lucide-react";
import FileUploadSection from "@/components/FileUploadSection";

export default function AdminPointage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Gestion du Pointage</h1>
          </div>
          <p className="text-white/90">Bienvenue, {session?.email}</p>
        </div>

        <div className="space-y-6">
          {/* Upload Pointage Section */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <div className="flex items-center gap-2 mb-4">
              <FileUp className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-semibold">Télécharger Pointage</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Téléchargez le fichier contenant les données de pointage des employés
            </p>
            <FileUploadSection
              title="Pointage"
              description="Upload pointage data"
              googleScriptUrl="https://script.google.com/macros/s/AKfycby4mCciphgVZY6iUNEYxcQMH6Tz90pJNLQqoqTcQNyZwk3W5mi3nhb8Ntp9IKM58coUlg/exec"
            />
          </div>

          {/* Upload Presence Section */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <div className="flex items-center gap-2 mb-4">
              <FileUp className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-semibold">Télécharger Présence</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Téléchargez le fichier contenant les données de présence et d'absence
            </p>
            <FileUploadSection
              title="Presence"
              description="Upload presence data"
              googleScriptUrl="https://script.google.com/macros/s/AKfycbxvF4KTipY1HDUPquth1Cpg8kIbeA2RfCZcVHyqcqRuuks0HsNzWPr60sNrkR-qHK4_yw/exec"
            />
          </div>
        </div>

        <div className="flex justify-center pt-8">
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </Button>
        </div>
      </div>
    </Layout>
  );
}
