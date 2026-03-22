import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Users, Radio, Trophy, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import CoinBalance from "@/components/CoinBalance";
import { PLAYER_NAMES } from "@/game/ludoEngine";

interface LiveGame {
  id: string;
  code: string;
  betAmount: number;
  maxPlayers: number;
  playerCount: number;
  playerNames: string[];
  winnerName?: string;
  resultText: string;
  status: "live" | "forfeit" | "inactive";
  createdAt: string;
}

const statusOrder: Record<LiveGame["status"], number> = {
  live: 0,
  forfeit: 1,
  inactive: 2,
};

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

const LiveGames = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveGames = useCallback(async () => {
    setLoading(true);

    const { data: rooms } = await supabase
      .from("game_rooms")
      .select("*")
      .in("status", ["in_progress", "finished", "cancelled"])
      .order("created_at", { ascending: false });

    if (!rooms || rooms.length === 0) {
      setGames([]);
      setLoading(false);
      return;
    }

    const roomIds = rooms.map((r) => r.id);

    const [{ data: gameStates }, { data: players }] = await Promise.all([
      supabase.from("game_states").select("room_id, token_positions").in("room_id", roomIds),
      supabase.from("room_players").select("*").in("room_id", roomIds),
    ]);

    const userIds = [...new Set((players || []).map((p) => p.user_id))];
    const profilesMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, phone")
        .in("user_id", userIds);

      profiles?.forEach((p) => {
        profilesMap[p.user_id] = p.display_name || p.phone.slice(-4);
      });
    }

    const parsedGames: LiveGame[] = rooms.map((room) => {
      const roomPlayers = (players || []).filter((p) => p.room_id === room.id);
      const gs = gameStates?.find((g) => g.room_id === room.id);
      const tokenData = gs?.token_positions as any;

      const hasWinner = typeof tokenData?.winner === "number";
      const stateFinished = tokenData?.turnPhase === "finished" || hasWinner;
      const isInactive = room.status !== "in_progress" || stateFinished;
      const isForfeit = isInactive && (roomPlayers.length < room.max_players || room.status === "cancelled");

      let winnerName: string | undefined;
      let resultText = "In progress";

      if (hasWinner) {
        const winnerSeat = tokenData.winner as number;
        const colorOrder = tokenData.colorOrder as number[] | undefined;

        if (Array.isArray(colorOrder) && colorOrder[winnerSeat] !== undefined) {
          const winnerColor = colorOrder[winnerSeat];
          const winnerPlayer = roomPlayers.find((p) => p.color_index === winnerColor);
          if (winnerPlayer) {
            winnerName = profilesMap[winnerPlayer.user_id] || "Bot";
          } else {
            // Player left (forfeit) — use color name
            winnerName = PLAYER_NAMES[winnerColor] || "Player";
          }
        }

        if (!winnerName && roomPlayers[winnerSeat]) {
          winnerName = profilesMap[roomPlayers[winnerSeat].user_id] || "Bot";
        }

        if (!winnerName) {
          winnerName = "Unknown";
        }

        resultText = `${winnerName} won!`;
      } else if (isForfeit) {
        resultText = "Game forfeited";
      } else if (isInactive) {
        resultText = "Game ended — no winner";
      }

      return {
        id: room.id,
        code: room.code,
        betAmount: room.bet_amount,
        maxPlayers: room.max_players,
        playerCount: roomPlayers.length,
        playerNames: roomPlayers.map((p) => profilesMap[p.user_id] || "Bot"),
        winnerName,
        resultText,
        status: !isInactive ? "live" : isForfeit ? "forfeit" : "inactive",
        createdAt: room.created_at,
      };
    });

    parsedGames.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    setGames(parsedGames);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLiveGames();

    const channel = supabase
      .channel("live-games")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_rooms" }, fetchLiveGames)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_states" }, fetchLiveGames)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players" }, fetchLiveGames)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLiveGames]);

  const activeCount = games.filter((g) => g.status === "live").length;

  return (
    <div className="px-4 pt-6 space-y-6">
      <div className="flex items-center gap-2">
        <Radio className="w-5 h-5 text-accent animate-pulse" />
        <h1 className="text-2xl font-heading font-bold">Live Games</h1>
        <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-heading">
          {activeCount} active
        </span>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : games.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center space-y-2">
          <Radio className="w-10 h-10 text-muted-foreground mx-auto opacity-30" />
          <p className="text-muted-foreground">No games yet</p>
          <p className="text-xs text-muted-foreground">Games will appear here as they start and finish</p>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game) => (
            <div
              key={game.id}
              className={`glass rounded-xl p-4 space-y-3 animate-slide-up ${game.status === "live" ? "" : "opacity-75"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading font-bold text-lg">#{game.code}</span>

                    {game.status === "live" && (
                      <span className="flex items-center gap-1 text-xs text-accent">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        LIVE
                      </span>
                    )}

                    {game.status === "forfeit" && (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <XCircle className="w-3 h-3" />
                        FORFEIT
                      </span>
                    )}

                    {game.status === "inactive" && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <XCircle className="w-3 h-3" />
                        FINISHED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{game.maxPlayers}P</span>
                    </div>
                    <CoinBalance amount={game.betAmount} size="sm" />
                    <div className="flex items-center gap-1 text-xs">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(game.createdAt)}</span>
                    </div>
                  </div>

                  {/* Result row */}
                  {game.status !== "live" && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {game.winnerName ? (
                        <div className="flex items-center gap-1 text-xs text-accent">
                          <Trophy className="w-3 h-3" />
                          <span className="font-heading font-bold">{game.resultText}</span>
                          <span className="text-muted-foreground ml-1">
                            (Pot: {game.betAmount * game.maxPlayers})
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">{game.resultText}</span>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="font-heading font-bold border-accent text-accent hover:bg-accent/10 ml-2 shrink-0"
                  onClick={() => navigate(`/game/${game.id}`)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  {game.status === "live" ? "Spectate" : "View"}
                </Button>
              </div>

              <div className="flex flex-wrap gap-1">
                {game.playerNames.length === 0 ? (
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">Players left</span>
                ) : (
                  game.playerNames.map((name, i) => (
                    <span
                      key={i}
                      className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground"
                    >
                      {name}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveGames;
