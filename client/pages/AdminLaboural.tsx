import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogOut, Briefcase, FileUp } from "lucide-react";
import FileUploadSection from "@/components/FileUploadSection";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminLaboural() {
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
        <div className="bg-gradient-to-r from-green-500 to-green-400 rounded-lg p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Briefcase className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Gestion Laboural</h1>
          </div>
          <p className="text-white/90">Bienvenue, {session?.email}</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Database Upload Section */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <div className="flex items-center gap-2 mb-4">
                <FileUp className="w-5 h-5 text-green-500" />
                <h2 className="text-xl font-semibold">
                  Télécharger la Base de Données RH
                </h2>
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

            {/* Recruitment Database Upload Section */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <div className="flex items-center gap-2 mb-4">
                <FileUp className="w-5 h-5 text-green-500" />
                <h2 className="text-xl font-semibold">
                  Télécharger la Base de Données Recrutement
                </h2>
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

            {/* Temporary Workers Database Upload Section */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <div className="flex items-center gap-2 mb-4">
                <FileUp className="w-5 h-5 text-green-500" />
                <h2 className="text-xl font-semibold">
                  Télécharger la Base de Données Travailleurs Temporaires
                </h2>
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

            {/* Turnover Form Section */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">
                Formulaire de Saisie - Turnover (Départs)
              </h2>
              <p className="text-muted-foreground mb-6">
                Saisissez les informations de départ des employés
              </p>

              <form onSubmit={handleTurnoverSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Mois */}
                  <div className="space-y-2">
                    <label htmlFor="mois" className="text-sm font-medium">
                      Mois et Année
                    </label>
                    <input
                      id="mois"
                      type="month"
                      value={turnoverData.mois}
                      onChange={handleTurnoverChange}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Baja */}
                  <div className="space-y-2">
                    <label htmlFor="baja" className="text-sm font-medium">
                      Baja
                    </label>
                    <input
                      id="baja"
                      type="text"
                      value={turnoverData.baja}
                      onChange={handleTurnoverChange}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Entrez Baja"
                    />
                  </div>

                  {/* Group */}
                  <div className="space-y-2">
                    <label htmlFor="group" className="text-sm font-medium">
                      Groupe
                    </label>
                    <input
                      id="group"
                      type="text"
                      value={turnoverData.group}
                      onChange={handleTurnoverChange}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Entrez le groupe"
                    />
                  </div>

                  {/* Contrat */}
                  <div className="space-y-2">
                    <label htmlFor="contrat" className="text-sm font-medium">
                      Contrat
                    </label>
                    <input
                      id="contrat"
                      type="text"
                      value={turnoverData.contrat}
                      onChange={handleTurnoverChange}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Entrez le type de contrat"
                    />
                  </div>

                  {/* Effectif 1 */}
                  <div className="space-y-2">
                    <label htmlFor="effectif1" className="text-sm font-medium">
                      Effectif 1
                    </label>
                    <input
                      id="effectif1"
                      type="number"
                      value={turnoverData.effectif1}
                      onChange={handleTurnoverChange}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Entrez l'effectif 1"
                    />
                  </div>

                  {/* Effectif 2 */}
                  <div className="space-y-2">
                    <label htmlFor="effectif2" className="text-sm font-medium">
                      Effectif 2
                    </label>
                    <input
                      id="effectif2"
                      type="number"
                      value={turnoverData.effectif2}
                      onChange={handleTurnoverChange}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Entrez l'effectif 2"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={handleTurnoverReset} disabled={turnoverLoading}>
                    Réinitialiser
                  </Button>
                  <Button type="submit" className="flex-1 bg-green-500 hover:bg-green-600" disabled={turnoverLoading}>
                    {turnoverLoading ? "Envoi en cours..." : "Soumettre"}
                  </Button>
                </div>
              </form>
            </div>
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
