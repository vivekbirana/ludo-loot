import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: "up" | "down";
  className?: string;
}

const StatCard = ({ icon: Icon, label, value, trend, className }: StatCardProps) => {
  return (
    <div className={cn("glass rounded-xl p-4 flex flex-col gap-2 animate-slide-up", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-heading font-bold">{value}</span>
        {trend && (
          <span className={cn("text-xs font-medium mb-1", trend === "up" ? "text-primary" : "text-destructive")}>
            {trend === "up" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
