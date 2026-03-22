import { useEffect, useState, useCallback } from "react";
import { Clock, Trophy, XCircle, Gamepad2 } from "lucide-react";
import CoinBalance from "@/components/CoinBalance";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type HistoryResult = "win" | "loss" | "forfeit" | "inactive";

interface HistoryMatch {
  id: string;
  code: string;
  result: HistoryResult;
  betAmount: number;
  pot: number;
  players: number;
  winnerName?: string;
  createdAt: string;
}

const formatTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const History = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<HistoryMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setMatches([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: rooms } = await supabase
      .from("game_rooms")
      .select("*")
      .in("status", ["in_progress", "finished", "cancelled"])
      .order("created_at", { ascending: false });

    if (!rooms || rooms.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const roomIds = rooms.map((r) => r.id);

    const [{ data: players }, { data: states }] = await Promise.all([
      supabase.from("room_players").select("*").in("room_id", roomIds),
      supabase.from("game_states").select("room_id, token_positions").in("room_id", roomIds),
    ]);

    const myRooms = rooms.filter(
      (room) =>
        room.created_by === user.id ||
        (players || []).some((p) => p.room_id === room.id && p.user_id === user.id)
    );

    if (myRooms.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set((players || []).map((p) => p.user_id))];
    const profilesMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, phone")
        .in("user_id", userIds);

      profiles?.forEach((profile) => {
        profilesMap[profile.user_id] = profile.display_name || profile.phone.slice(-4);
      });
    }

    const parsedMatches = myRooms
      .map((room): HistoryMatch | null => {
        const roomPlayers = (players || []).filter((p) => p.room_id === room.id);
        const state = states?.find((s) => s.room_id === room.id);
        const tokenData = state?.token_positions as any;

        const winnerSeat = typeof tokenData?.winner === "number" ? (tokenData.winner as number) : null;
        const stateFinished = tokenData?.turnPhase === "finished" || winnerSeat !== null;
        const isFinished = room.status !== "in_progress" || stateFinished;

        if (!isFinished) return null;

        let winnerUserId: string | null = null;
        let winnerName: string | undefined;

        if (winnerSeat !== null) {
          const colorOrder = tokenData?.colorOrder as number[] | undefined;

          if (Array.isArray(colorOrder) && colorOrder[winnerSeat] !== undefined) {
            const winnerColor = colorOrder[winnerSeat];
            const winnerPlayer = roomPlayers.find((p) => p.color_index === winnerColor);
            if (winnerPlayer) {
              winnerUserId = winnerPlayer.user_id;
              winnerName = profilesMap[winnerPlayer.user_id] || "Bot";
            }
          }

          if (!winnerUserId && roomPlayers[winnerSeat]) {
            winnerUserId = roomPlayers[winnerSeat].user_id;
            winnerName = profilesMap[winnerUserId] || "Bot";
          }
        }

        const isForfeit = room.status === "cancelled" || roomPlayers.length < room.max_players;

        let result: HistoryResult = "inactive";
        if (isForfeit) {
          result = winnerUserId === user.id ? "win" : "forfeit";
        } else if (winnerUserId) {
          result = winnerUserId === user.id ? "win" : "loss";
        }

        return {
          id: room.id,
          code: room.code,
          result,
          betAmount: room.bet_amount,
          pot: room.bet_amount * room.max_players,
          players: room.max_players,
          winnerName,
          createdAt: room.created_at,
        };
      })
      .filter((match): match is HistoryMatch => match !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setMatches(parsedMatches);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchHistory();

    const channel = supabase
      .channel("history-games")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_rooms" }, fetchHistory)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_states" }, fetchHistory)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players" }, fetchHistory)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHistory]);

  return (
    <div className="px-4 pt-6 space-y-6">
      <h1 className="text-2xl font-heading font-bold">Match History</h1>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading history...</p>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-heading text-lg">No matches yet</p>
          <p className="text-sm">Finished and forfeited games will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map((match) => (
            <div key={match.id} className="glass rounded-xl p-4 flex items-center justify-between animate-slide-up">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    match.result === "win"
                      ? "bg-primary/20"
                      : match.result === "loss"
                        ? "bg-destructive/20"
                        : "bg-secondary"
                  )}
                >
                  {match.result === "win" ? (
                    <Trophy className="w-5 h-5 text-primary" />
                  ) : (
                    <XCircle
                      className={cn(
                        "w-5 h-5",
                        match.result === "loss" ? "text-destructive" : "text-muted-foreground"
                      )}
                    />
                  )}
                </div>

                <div>
                  <p className="font-heading font-bold">
                    {match.result === "win"
                      ? "Victory"
                      : match.result === "loss"
                        ? "Defeat"
                        : match.result === "forfeit"
                          ? "Forfeit"
                          : "Inactive"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(match.createdAt)}</span>
                    <span>•</span>
                    <span>#{match.code}</span>
                    <span>•</span>
                    <span>{match.players}P</span>
                    {match.winnerName && (
                      <>
                        <span>•</span>
                        <span>Winner: {match.winnerName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                {match.result === "win" ? (
                  <CoinBalance amount={match.pot} size="sm" />
                ) : match.result === "loss" || match.result === "forfeit" ? (
                  <span className="text-sm text-destructive font-heading font-bold">-{match.betAmount}</span>
                ) : (
                  <span className="text-sm text-muted-foreground font-heading font-bold">--</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
