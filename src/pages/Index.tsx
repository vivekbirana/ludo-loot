import { Gamepad2, Trophy, TrendingUp, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CoinBalance from "@/components/CoinBalance";
import StatCard from "@/components/StatCard";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="text-2xl font-heading font-bold">Player</h1>
        </div>
        <CoinBalance amount={1000} size="md" />
      </div>

      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-primary p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-background/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-background/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <h2 className="text-2xl font-heading font-bold text-primary-foreground mb-1">
            Ludo Tournament
          </h2>
          <p className="text-primary-foreground/80 text-sm mb-4">
            Play, bet & win real coins!
          </p>
          <Link to="/play">
            <Button className="bg-background text-foreground font-heading font-bold hover:bg-background/90">
              Play Now
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Gamepad2} label="Games" value={0} />
        <StatCard icon={Trophy} label="Wins" value={0} />
        <StatCard icon={TrendingUp} label="Win Rate" value="0%" />
        <StatCard icon={Flame} label="Streak" value={0} />
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-heading font-bold">Quick Play</h2>
        <div className="grid grid-cols-3 gap-3">
          {[50, 100, 200].map((bet) => (
            <Link key={bet} to="/play">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="glass rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <CoinBalance amount={bet} size="sm" className="justify-center" />
                <p className="text-xs text-muted-foreground mt-1">2-4 Players</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
