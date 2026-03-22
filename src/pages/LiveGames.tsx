import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Users, Coins, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import CoinBalance from "@/components/CoinBalance";

interface LiveGame {
  id: string;
  code: string;
  bet_amount: number;
  max_players: number;
  playerCount: number;
  playerNames: string[];
}

const LiveGames = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveGames = async () => {
    // Get in_progress rooms that have game states without a winner
    const { data: rooms } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("status", "in_progress")
      .is("winner_id", null)
      .order("created_at", { ascending: false });

    if (!rooms || rooms.length === 0) {
      setGames([]);
      setLoading(false);
      return;
    }

    // Filter out rooms with no active game state (winner already set in game_states)
    const roomIds = rooms.map((r) => r.id);
    const { data: gameStates } = await supabase
      .from("game_states")
      .select("room_id, winner_id")
      .in("room_id", roomIds);

    const activeRoomIds = roomIds.filter((rid) => {
      const gs = gameStates?.find((g) => g.room_id === rid);
      return !gs || !gs.winner_id;
    });

    const roomIds = rooms.map((r) => r.id);
    if (activeRoomIds.length === 0) {
      setGames([]);
      setLoading(false);
      return;
    }

    const { data: players } = await supabase
      .from("room_players")
      .select("*")
      .in("room_id", activeRoomIds);

    const userIds = [...new Set((players || []).map((p) => p.user_id))];
    let profilesMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, phone")
        .in("user_id", userIds);
      profiles?.forEach((p) => {
        profilesMap[p.user_id] = p.display_name || p.phone.slice(-4);
      });
    }

    const activeRooms = rooms.filter((r) => activeRoomIds.includes(r.id));
    const liveGames: LiveGame[] = activeRooms.map((room) => {
      const roomPlayers = (players || []).filter((p) => p.room_id === room.id);
      return {
        id: room.id,
        code: room.code,
        bet_amount: room.bet_amount,
        max_players: room.max_players,
        playerCount: roomPlayers.length,
        playerNames: roomPlayers.map(
          (p) => profilesMap[p.user_id] || "Bot"
        ),
      };
    });

    setGames(liveGames);
    setLoading(false);
  };

  useEffect(() => {
    fetchLiveGames();

    const channel = supabase
      .channel("live-games")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_rooms" }, () => {
        fetchLiveGames();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="px-4 pt-6 space-y-6">
      <div className="flex items-center gap-2">
        <Radio className="w-5 h-5 text-accent animate-pulse" />
        <h1 className="text-2xl font-heading font-bold">Live Games</h1>
        <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-heading">
          {games.length} active
        </span>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : games.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center space-y-2">
          <Radio className="w-10 h-10 text-muted-foreground mx-auto opacity-30" />
          <p className="text-muted-foreground">No live games right now</p>
          <p className="text-xs text-muted-foreground">Games will appear here when players start playing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game) => (
            <div
              key={game.id}
              className="glass rounded-xl p-4 space-y-3 animate-slide-up"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-lg">#{game.code}</span>
                    <span className="flex items-center gap-1 text-xs text-accent">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      LIVE
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{game.playerCount}P</span>
                    </div>
                    <CoinBalance amount={game.bet_amount} size="sm" />
                    <span className="text-xs">
                      Pot: <CoinBalance amount={game.bet_amount * game.max_players} size="sm" className="inline-flex" />
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="font-heading font-bold border-accent text-accent hover:bg-accent/10"
                  onClick={() => navigate(`/game/${game.id}`)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Spectate
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {game.playerNames.map((name, i) => (
                  <span
                    key={i}
                    className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveGames;
