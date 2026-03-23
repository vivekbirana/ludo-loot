import { Gamepad2, Trophy, TrendingUp, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CoinBalance from "@/components/CoinBalance";
import StatCard from "@/components/StatCard";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Index = () => {
  const { user } = useAuth();

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

  const { data: stats } = useQuery({
    queryKey: ["player-stats", user?.id],
    queryFn: async () => {
      const { data: playerRooms } = await supabase
        .from("room_players")
        .select("room_id")
        .eq("user_id", user!.id);

      if (!playerRooms || playerRooms.length === 0) return { played: 0, won: 0, winRate: "0%", streak: 0 };

      const roomIds = playerRooms.map((r) => r.room_id);
      const { data: finishedRooms } = await supabase
        .from("game_rooms")
        .select("id")
        .in("id", roomIds)
        .eq("status", "finished");

      const played = finishedRooms?.length || 0;
      if (played === 0) return { played: 0, won: 0, winRate: "0%", streak: 0 };

      const finishedIds = finishedRooms!.map((r) => r.id);
      const { data: gameStates } = await supabase
        .from("game_states")
        .select("room_id, token_positions")
        .in("room_id", finishedIds);

      let won = 0;
      for (const gs of gameStates || []) {
        const tp = gs.token_positions as any;
        if (tp?.winner === null || tp?.winner === undefined) continue;
        const { data: roomPlayers } = await supabase
          .from("room_players")
          .select("user_id")
          .eq("room_id", gs.room_id)
          .order("joined_at", { ascending: true });
        if (roomPlayers && roomPlayers[tp.winner]?.user_id === user!.id) won++;
      }

      const winRate = played > 0 ? `${Math.round((won / played) * 100)}%` : "0%";
      return { played, won, winRate, streak: 0 };
    },
    enabled: !!user,
  });

  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="text-2xl font-heading font-bold">Player</h1>
        </div>
        <CoinBalance amount={wallet?.balance ?? 0} size="md" />
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
