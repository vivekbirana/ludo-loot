import { cn } from "@/lib/utils";

interface CoinBalanceProps {
  amount: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const CoinBalance = ({ amount, size = "md", className }: CoinBalanceProps) => {
  const sizes = {
    sm: "text-sm gap-1",
    md: "text-lg gap-1.5",
    lg: "text-3xl gap-2",
  };

  const coinSizes = {
    sm: "w-4 h-4 text-[8px]",
    md: "w-5 h-5 text-[10px]",
    lg: "w-8 h-8 text-sm",
  };

  return (
    <div className={cn("flex items-center font-heading font-bold", sizes[size], className)}>
      <div className={cn("rounded-full bg-gradient-gold flex items-center justify-center text-coin-foreground font-bold", coinSizes[size])}>
        ₹
      </div>
      <span className="text-gradient-gold">{amount.toLocaleString("en-IN")}</span>
    </div>
  );
};

export default CoinBalance;
