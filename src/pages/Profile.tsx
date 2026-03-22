import { Gamepad2, Trophy, TrendingUp, ArrowUpRight, ArrowDownLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoinBalance from "@/components/CoinBalance";
import StatCard from "@/components/StatCard";
import { cn } from "@/lib/utils";

const mockTransactions = [
  { id: 1, type: "credit", amount: 200, description: "Won 2P match", date: "2 hours ago" },
  { id: 2, type: "debit", amount: 100, description: "Joined room #A1B2", date: "2 hours ago" },
  { id: 3, type: "credit", amount: 1000, description: "Welcome bonus", date: "1 day ago" },
  { id: 4, type: "debit", amount: 200, description: "Joined room #C3D4", date: "1 day ago" },
];

const Profile = () => {
  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Profile Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-heading font-bold text-xl">
            P
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold">Player</h1>
            <p className="text-sm text-muted-foreground">+91 •••••••890</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <LogOut className="w-5 h-5" />
        </Button>
      </div>

      {/* Wallet */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <p className="text-sm text-muted-foreground uppercase tracking-wider">Wallet Balance</p>
        <CoinBalance amount={1000} size="lg" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Gamepad2} label="Played" value={0} />
        <StatCard icon={Trophy} label="Won" value={0} />
        <StatCard icon={TrendingUp} label="Rate" value="0%" />
      </div>

      {/* Transactions */}
      <div className="space-y-3">
        <h2 className="text-lg font-heading font-bold">Transactions</h2>
        <div className="space-y-2">
          {mockTransactions.map((tx) => (
            <div key={tx.id} className="glass rounded-xl p-3 flex items-center gap-3 animate-slide-up">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center",
                tx.type === "credit" ? "bg-primary/20" : "bg-destructive/20"
              )}>
                {tx.type === "credit" ? (
                  <ArrowDownLeft className="w-4 h-4 text-primary" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-destructive" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{tx.description}</p>
                <p className="text-xs text-muted-foreground">{tx.date}</p>
              </div>
              <span className={cn(
                "font-heading font-bold text-sm",
                tx.type === "credit" ? "text-primary" : "text-destructive"
              )}>
                {tx.type === "credit" ? "+" : "-"}{tx.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
