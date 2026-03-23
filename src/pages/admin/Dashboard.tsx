import { Users, Gamepad2, Coins, TrendingUp } from "lucide-react";
import StatCard from "@/components/StatCard";

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and analytics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value="1,234" trend="up" />
        <StatCard icon={Gamepad2} label="Active Rooms" value={42} trend="up" />
        <StatCard icon={Coins} label="Total Bets Today" value="₹45,200" />
        <StatCard icon={TrendingUp} label="Games Today" value={189} trend="up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent games */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-heading font-bold mb-4">Recent Games</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium">Room #{String.fromCharCode(64 + i)}1B{i}</p>
                  <p className="text-xs text-muted-foreground">{i * 2} min ago • 4P</p>
                </div>
                <span className="text-sm text-accent font-heading font-bold">₹{i * 100}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top players */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-heading font-bold mb-4">Top Players Today</h2>
          <div className="space-y-3">
            {["Rahul K.", "Priya S.", "Amit R.", "Sneha M.", "Vikram P."].map((name, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm text-muted-foreground font-heading font-bold">
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium">{name}</p>
                </div>
                <span className="text-sm text-primary font-heading font-bold">{5 - i} wins</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
