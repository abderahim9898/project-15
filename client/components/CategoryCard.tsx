import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface CategoryCardProps {
  icon: ReactNode;
  title: string;
  description?: string;
  href: string;
}

export default function CategoryCard({
  icon,
  title,
  description,
  href,
}: CategoryCardProps) {
  return (
    <Link to={href} className="group block">
      <div className="p-4 sm:p-5 rounded-full border border-border bg-card hover:bg-muted hover:border-foreground transition-all duration-300 flex items-center gap-3 min-w-max whitespace-nowrap">
        <div className="text-2xl">
          {icon}
        </div>
        <span className="text-sm sm:text-base font-medium text-card-foreground group-hover:text-foreground transition-colors duration-300">
          {title}
        </span>
      </div>
    </Link>
  );
}
