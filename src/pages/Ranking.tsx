import { Trophy, Medal, Crown } from "lucide-react";
import CoinBalance from "@/components/CoinBalance";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardEntry {
  rank: number;
  name: string;
  wins: number;
  earnings: number;
  userId: string;
}

const rankIcons = {
  1: Crown,
  2: Medal,
  3: Trophy,
};

const rankColors = {
  1: "text-accent",
  2: "text-foreground/70",
  3: "text-orange-400",
};

const Ranking = () => {
  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      // Get all finished rooms with winner info
      const { data: rooms } = await supabase
        .from("game_rooms")
        .select("id, bet_amount, max_players, winner_id, status")
        .eq("status", "finished");

      if (!rooms || rooms.length === 0) return [];

      // Get game states to find winners by seat index
      const roomIds = rooms.map((r) => r.id);
      const { data: gameStates } = await supabase
        .from("game_states")
        .select("room_id, token_positions")
        .in("room_id", roomIds);

      // Get all room players
      const { data: players } = await supabase
        .from("room_players")
        .select("room_id, user_id, color_index")
        .in("room_id", roomIds);

      if (!players || !gameStates) return [];

      // Build win counts and earnings per user
      const userStats: Record<string, { wins: number; earnings: number }> = {};

      for (const gs of gameStates) {
        const tp = gs.token_positions as any;
        if (tp?.winner === null || tp?.winner === undefined) continue;

        const winnerSeat = tp.winner;
        const roomPlayers = players.filter((p) => p.room_id === gs.room_id);
        // Sort by joined_at equivalent (order in array = seat order)
        // Find the player at the winner seat
        const winner = roomPlayers[winnerSeat];
        if (!winner) continue;

        const room = rooms.find((r) => r.id === gs.room_id);
        if (!room) continue;

        if (!userStats[winner.user_id]) {
          userStats[winner.user_id] = { wins: 0, earnings: 0 };
        }
        userStats[winner.user_id].wins += 1;
        // Winner gets pot (bet * playerCount) minus their own bet
        userStats[winner.user_id].earnings += room.bet_amount * (room.max_players - 1);
      }

      // Get unique user IDs
      const userIds = Object.keys(userStats);
      if (userIds.length === 0) return [];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, phone")
        .in("user_id", userIds);

      // Build leaderboard sorted by wins
      const entries: LeaderboardEntry[] = userIds
        .map((uid) => {
          const profile = profiles?.find((p) => p.user_id === uid);
          const name = profile?.display_name || 
            (profile?.phone ? `${profile.phone.slice(-4)}` : "Player");
          return {
            rank: 0,
            name,
            wins: userStats[uid].wins,
            earnings: userStats[uid].earnings,
            userId: uid,
          };
        })
        .sort((a, b) => b.wins - a.wins || b.earnings - a.earnings);

      entries.forEach((e, i) => (e.rank = i + 1));
      return entries.slice(0, 20);
    },
  });

  if (isLoading) {
    return (
      <div className="px-4 pt-6 flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="px-4 pt-6 space-y-6">
        <h1 className="text-2xl font-heading font-bold">Leaderboard</h1>
        <p className="text-center text-muted-foreground py-8">No games completed yet</p>
      </div>
    );
  }

  const top3 = leaderboard.filter((p) => p.rank <= 3);

  return (
    <div className="px-4 pt-6 space-y-6">
      <h1 className="text-2xl font-heading font-bold">Leaderboard</h1>

      {/* Top 3 Podium */}
      {top3.length >= 3 && (
        <div className="flex items-end justify-center gap-3 py-4">
          {[2, 1, 3].map((rank) => {
            const player = leaderboard.find((p) => p.rank === rank);
            if (!player) return null;
            const RankIcon = rankIcons[rank as keyof typeof rankIcons];
            const heights = { 1: "h-28", 2: "h-20", 3: "h-16" };
            return (
              <div key={rank} className="flex flex-col items-center gap-2">
                <RankIcon className={cn("w-6 h-6", rankColors[rank as keyof typeof rankColors])} />
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-heading font-bold text-sm">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-xs font-medium truncate max-w-[80px]">{player.name}</p>
                <div className={cn(
                  "w-20 rounded-t-lg bg-gradient-card flex items-center justify-center border border-border/50",
                  heights[rank as keyof typeof heights]
                )}>
                  <span className={cn("text-2xl font-heading font-bold", rankColors[rank as keyof typeof rankColors])}>
                    #{rank}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="space-y-2">
        {leaderboard.map((player) => (
          <div key={player.userId} className="glass rounded-xl p-3 flex items-center gap-3 animate-slide-up">
            <span className={cn(
              "w-8 text-center font-heading font-bold text-lg",
              player.rank <= 3 ? rankColors[player.rank as keyof typeof rankColors] : "text-muted-foreground"
            )}>
              {player.rank}
            </span>
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-heading font-bold text-sm">
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-heading font-bold text-sm">{player.name}</p>
              <p className="text-xs text-muted-foreground">{player.wins} wins</p>
            </div>
            <CoinBalance amount={player.earnings} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Ranking;
