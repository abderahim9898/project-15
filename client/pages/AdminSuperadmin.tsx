import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogOut, Shield, FileUp } from "lucide-react";
import FileUploadSection from "@/components/FileUploadSection";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSuperadmin() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [turnoverLoading, setTurnoverLoading] = useState(false);
  const [turnoverData, setTurnoverData] = useState({
    mois: "",
    baja: "",
    group: "",
    contrat: "",
    effectif1: "",
    effectif2: "",
  });

  const handleTurnoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setTurnoverData(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleTurnoverReset = () => {
    setTurnoverData({
      mois: "",
      baja: "",
      group: "",
      contrat: "",
      effectif1: "",
      effectif2: "",
    });
  };

  const formatMonthYear = (monthValue: string): string => {
    if (!monthValue) return "";
    const [year, month] = monthValue.split("-");
    const monthNum = parseInt(month) - 1;
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    return `${monthNames[monthNum]} 2, ${year}`;
  };

  const handleTurnoverSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!turnoverData.mois || !turnoverData.baja || !turnoverData.group || !turnoverData.contrat || !turnoverData.effectif1 || !turnoverData.effectif2) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setTurnoverLoading(true);
    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          googleScriptUrl: "https://script.google.com/macros/s/AKfycbxIMp6iuxHymhAOEgHKjcQjRHisRkNktK2PQJl8cgzaukc3CKJ1sdX95isSqelipxSA/exec",
          action: "submitForm",
          mois: formatMonthYear(turnoverData.mois),
          baja: turnoverData.baja,
          groupe: turnoverData.group,
          contrat: turnoverData.contrat,
          effectif1: turnoverData.effectif1,
          effectif2: turnoverData.effectif2,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la soumission");
      }

      toast({
        title: "Succès",
        description: "Données de turnover ajoutées avec succès",
      });
      handleTurnoverReset();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setTurnoverLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Panneau Superadmin</h1>
          </div>
          <p className="text-white/90">Bienvenue, {session?.email}</p>
        </div>

        <div className="space-y-6">
          {/* Pointage Uploads */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              Gestion du Pointage
            </h2>
            <div className="grid grid-cols-1 gap-6">
              <div className="border border-border rounded-lg p-6 bg-card">
                <div className="flex items-center gap-2 mb-4">
                  <FileUp className="w-5 h-5 text-purple-500" />
                  <h3 className="text-xl font-semibold">Télécharger Pointage</h3>
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

              <div className="border border-border rounded-lg p-6 bg-card">
                <div className="flex items-center gap-2 mb-4">
                  <FileUp className="w-5 h-5 text-purple-500" />
                  <h3 className="text-xl font-semibold">Télécharger Présence</h3>
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
          </div>

          {/* Laboural Uploads */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              Gestion Laboural
            </h2>
            <div className="grid grid-cols-1 gap-6">
              <div className="border border-border rounded-lg p-6 bg-card">
                <div className="flex items-center gap-2 mb-4">
                  <FileUp className="w-5 h-5 text-purple-500" />
                  <h3 className="text-xl font-semibold">Télécharger la Base de Données RH</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Téléchargez le fichier contenant les données des employés
                </p>
                <FileUploadSection
                  title="Database"
                  description="Upload RH database"
                  googleScriptUrl="https://script.google.com/macros/s/AKfycbzTolLMQjvwvDXe8O3FgVIK_sjnOGzR0vdwk7q6RpzRas-dHPUbmEAXmHNLx9c6zGrA/exec"
                />
              </div>

              <div className="border border-border rounded-lg p-6 bg-card">
                <div className="flex items-center gap-2 mb-4">
                  <FileUp className="w-5 h-5 text-purple-500" />
                  <h3 className="text-xl font-semibold">Télécharger la Base de Données Recrutement</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Téléchargez le fichier contenant les données de recrutement
                </p>
                <FileUploadSection
                  title="Recruitment"
                  description="Upload recruitment database"
                  googleScriptUrl="https://script.google.com/macros/s/AKfycbz16Vg2z5c-1C8QO5Q94yMMXS-r3YZJRVKX75BMZ8MOUANKLhoRHmHna5DIkNP4o2Wc/exec"
                />
              </div>

              <div className="border border-border rounded-lg p-6 bg-card">
                <div className="flex items-center gap-2 mb-4">
                  <FileUp className="w-5 h-5 text-purple-500" />
                  <h3 className="text-xl font-semibold">Télécharger la Base de Données Travailleurs Temporaires</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Téléchargez le fichier contenant les données des travailleurs temporaires
                </p>
                <FileUploadSection
                  title="Temporary Workers"
                  description="Upload temporary workers database"
                  googleScriptUrl="https://script.google.com/macros/s/AKfycbxKLKZq4WXqT1Ueh6fFWW9XgOLA2L2ACGG0O_i8FoO29s3ESgQ1lPADUrmmX9cC6sTq/exec"
                />
              </div>
            </div>
          </div>

          {/* Turnover Form */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-semibold mb-4">
              Formulaire de Saisie - Turnover (Départs)
            </h2>
            <p className="text-muted-foreground mb-6">
              Saisissez les informations de départ des employés
            </p>

            <form onSubmit={handleTurnoverSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="mois" className="text-sm font-medium">
                    Mois et Année
                  </label>
                  <input
                    id="mois"
                    type="month"
                    value={turnoverData.mois}
                    onChange={handleTurnoverChange}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="baja" className="text-sm font-medium">
                    Baja
                  </label>
                  <input
                    id="baja"
                    type="text"
                    value={turnoverData.baja}
                    onChange={handleTurnoverChange}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Entrez Baja"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="group" className="text-sm font-medium">
                    Groupe
                  </label>
                  <input
                    id="group"
                    type="text"
                    value={turnoverData.group}
                    onChange={handleTurnoverChange}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Entrez le groupe"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="contrat" className="text-sm font-medium">
                    Contrat
                  </label>
                  <input
                    id="contrat"
                    type="text"
                    value={turnoverData.contrat}
                    onChange={handleTurnoverChange}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Entrez le type de contrat"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="effectif1" className="text-sm font-medium">
                    Effectif 1
                  </label>
                  <input
                    id="effectif1"
                    type="number"
                    value={turnoverData.effectif1}
                    onChange={handleTurnoverChange}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Entrez l'effectif 1"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="effectif2" className="text-sm font-medium">
                    Effectif 2
                  </label>
                  <input
                    id="effectif2"
                    type="number"
                    value={turnoverData.effectif2}
                    onChange={handleTurnoverChange}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Entrez l'effectif 2"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={handleTurnoverReset} disabled={turnoverLoading}>
                  Réinitialiser
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  disabled={turnoverLoading}
                >
                  {turnoverLoading ? "Envoi en cours..." : "Soumettre"}
                </Button>
              </div>
            </form>
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
