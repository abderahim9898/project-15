import Layout from "./Layout";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface CategoryPlaceholderProps {
  title: string;
  icon: string;
}

export default function CategoryPlaceholder({
  title,
  icon,
}: CategoryPlaceholderProps) {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Retour au tableau de bord
        </Link>

        <div className="space-y-8 text-center py-12 sm:py-20">
          <div className="text-6xl sm:text-8xl">{icon}</div>
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-primary">
              {title}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
              Cette section arrive bientôt. Continuez à demander pour créer cette page avec les fonctionnalités dont vous avez besoin.
            </p>
          </div>

          <div className="pt-8">
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
