import { Gamepad2, Trophy, TrendingUp, ArrowUpRight, ArrowDownLeft, LogOut, Plus, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoinBalance from "@/components/CoinBalance";
import StatCard from "@/components/StatCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const phone = user?.user_metadata?.phone || user?.phone || "";
  const maskedPhone = phone
    ? `${phone.slice(0, 3)} •••••••${phone.slice(-3)}`
    : "";

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Profile Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-heading font-bold text-xl">
            {phone ? phone.slice(-2, -1) : "P"}
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold">Player</h1>
            <p className="text-sm text-muted-foreground">{maskedPhone}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={handleSignOut}>
          <LogOut className="w-5 h-5" />
        </Button>
      </div>

      {/* Wallet */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <p className="text-sm text-muted-foreground uppercase tracking-wider">Wallet Balance</p>
        <CoinBalance amount={wallet?.balance ?? 0} size="lg" />
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
          {(transactions ?? []).map((tx) => (
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
                <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
              </div>
              <span className={cn(
                "font-heading font-bold text-sm",
                tx.type === "credit" ? "text-primary" : "text-destructive"
              )}>
                {tx.type === "credit" ? "+" : "-"}{tx.amount}
              </span>
            </div>
          ))}
          {(!transactions || transactions.length === 0) && (
            <p className="text-center text-muted-foreground text-sm py-4">No transactions yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
