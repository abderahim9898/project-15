import { ReactNode } from "react";

interface SummaryCardProps {
  icon: ReactNode;
  title: string;
  value: number | string;
  subtitle?: string;
  color?: "blue" | "green" | "orange" | "red";
}

export default function SummaryCard({
  icon,
  title,
  value,
  subtitle,
  color = "blue",
}: SummaryCardProps) {
  const colorMap = {
    blue: "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300",
    green: "bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300",
    orange: "bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300",
    red: "bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300",
  };

  return (
    <div
      className={`p-6 rounded-lg border ${colorMap[color]} shadow-card hover:shadow-lg transition-shadow`}
    >
      <div className="flex items-center gap-4">
        <div className="text-3xl">{icon}</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
