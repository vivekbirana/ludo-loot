import { Users, Gamepad2, Coins, TrendingUp, Trophy, Clock } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const Dashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [profilesRes, walletsRes, roomsRes, roomsTodayRes, txTodayRes, matchesRes, matchesTodayRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("wallets").select("balance"),
        supabase.from("game_rooms").select("id", { count: "exact", head: true }).in("status", ["waiting", "in_progress"]),
        supabase.from("game_rooms").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
        supabase.from("transactions").select("amount, type").gte("created_at", todayISO),
        supabase.from("match_records").select("id, bet_amount, duration_seconds, winner_user_id"),
        supabase.from("match_records").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
      ]);

      const totalUsers = profilesRes.count ?? 0;
      const activeRooms = roomsRes.count ?? 0;
      const gamesToday = matchesTodayRes.count ?? 0;
      const totalMatches = matchesRes.data?.length ?? 0;

      const totalBetsToday = (txTodayRes.data ?? [])
        .filter((t) => t.type === "debit")
        .reduce((sum, t) => sum + t.amount, 0);

      const totalCirculation = (walletsRes.data ?? []).reduce((sum, w) => sum + w.balance, 0);

      const totalBetVolume = (matchesRes.data ?? []).reduce((sum, m) => sum + m.bet_amount, 0);

      const avgDuration = totalMatches > 0
        ? Math.round((matchesRes.data ?? []).reduce((sum, m) => sum + (m.duration_seconds ?? 0), 0) / totalMatches)
        : 0;

      return { totalUsers, activeRooms, gamesToday, totalBetsToday, totalCirculation, totalMatches, totalBetVolume, avgDuration };
    },
    refetchInterval: 30000,
  });

  const { data: recentMatches } = useQuery({
    queryKey: ["admin-recent-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("match_records")
        .select("*")
        .order("finished_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: topWinners } = useQuery({
    queryKey: ["admin-top-winners"],
    queryFn: async () => {
      const { data: matches } = await supabase
        .from("match_records")
        .select("winner_user_id, bet_amount")
        .not("winner_user_id", "is", null);

      if (!matches) return [];

      const winMap: Record<string, { wins: number; earnings: number }> = {};
      for (const m of matches) {
        if (!m.winner_user_id) continue;
        if (!winMap[m.winner_user_id]) winMap[m.winner_user_id] = { wins: 0, earnings: 0 };
        winMap[m.winner_user_id].wins++;
        winMap[m.winner_user_id].earnings += m.bet_amount * 2;
      }

      const sorted = Object.entries(winMap)
        .sort((a, b) => b[1].wins - a[1].wins)
        .slice(0, 5);

      const userIds = sorted.map(([id]) => id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, phone, display_name").in("user_id", userIds);
      const profileMap: Record<string, { phone: string; display_name: string | null }> = {};
      for (const p of profiles ?? []) profileMap[p.user_id] = p;

      return sorted.map(([id, s]) => ({
        userId: id,
        name: profileMap[id]?.display_name || profileMap[id]?.phone || id.slice(0, 8),
        wins: s.wins,
        earnings: s.earnings,
      }));
    },
    refetchInterval: 60000,
  });

  const s = stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and analytics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={s?.totalUsers ?? "–"} />
        <StatCard icon={Gamepad2} label="Active Rooms" value={s?.activeRooms ?? "–"} trend="up" />
        <StatCard icon={Coins} label="Bets Today" value={s ? `₹${s.totalBetsToday.toLocaleString()}` : "–"} />
        <StatCard icon={TrendingUp} label="Games Today" value={s?.gamesToday ?? "–"} trend="up" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Coins} label="Total Circulation" value={s ? `₹${s.totalCirculation.toLocaleString()}` : "–"} />
        <StatCard icon={Trophy} label="Total Matches" value={s?.totalMatches ?? "–"} />
        <StatCard icon={Coins} label="Total Bet Volume" value={s ? `₹${s.totalBetVolume.toLocaleString()}` : "–"} />
        <StatCard icon={Clock} label="Avg Game Duration" value={s ? `${Math.floor(s.avgDuration / 60)}m ${s.avgDuration % 60}s` : "–"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent matches */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-heading font-bold mb-4">Recent Matches</h2>
          <div className="space-y-3">
            {(recentMatches ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium">Room #{m.room_code}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(m.finished_at), "MMM d, HH:mm")} • {m.player_count}P • {m.finish_reason}
                  </p>
                </div>
                <span className="text-sm text-accent font-heading font-bold">₹{m.bet_amount}</span>
              </div>
            ))}
            {(!recentMatches || recentMatches.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No matches yet</p>
            )}
          </div>
        </div>

        {/* Top winners */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-heading font-bold mb-4">Top Winners</h2>
          <div className="space-y-3">
            {(topWinners ?? []).map((w, i) => (
              <div key={w.userId} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm text-muted-foreground font-heading font-bold">
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium">{w.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-primary font-heading font-bold">{w.wins} wins</p>
                  <p className="text-xs text-accent">₹{w.earnings.toLocaleString()}</p>
                </div>
              </div>
            ))}
            {(!topWinners || topWinners.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
