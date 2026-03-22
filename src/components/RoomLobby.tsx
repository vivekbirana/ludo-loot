import { Check, X, Crown, LogOut, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoinBalance from "@/components/CoinBalance";
import { GameRoom } from "@/hooks/useGameRooms";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { PLAYER_COLORS, PLAYER_NAMES } from "@/game/ludoEngine";

interface RoomLobbyProps {
  room: GameRoom;
  onReady: () => void;
  onLeave: () => void;
  onStart: () => void;
  onFillBots?: () => void;
  onSelectColor?: (colorIndex: number) => void;
}

const RoomLobby = ({ room, onReady, onLeave, onStart, onFillBots, onSelectColor }: RoomLobbyProps) => {
  const { user } = useAuth();
  const isCreator = user?.id === room.created_by;
  const currentPlayer = room.players.find((p) => p.user_id === user?.id);
  const allReady = room.players.length >= 2 && room.players.every((p) => p.is_ready);
  const isGameStarted = room.status === "in_progress";

  const takenColors = room.players
    .filter((p) => p.color_index != null)
    .map((p) => p.color_index!);

  const myColor = currentPlayer?.color_index;

  // Opposite color pairs: Red(0) <-> Yellow(2), Green(1) <-> Blue(3)
  const OPPOSITE_MAP: Record<number, number> = { 0: 2, 2: 0, 1: 3, 3: 1 };

  // For 2P mode, determine which colors are available
  const getDisabledColors = (idx: number): boolean => {
    const isTaken = takenColors.includes(idx) && myColor !== idx;
    if (isTaken) return true;

    // In 2P mode, if opponent picked a color, only allow the opposite
    if (room.max_players === 2) {
      const otherPlayer = room.players.find((p) => p.user_id !== user?.id && p.color_index != null);
      if (otherPlayer?.color_index != null) {
        return idx !== OPPOSITE_MAP[otherPlayer.color_index];
      }
      // If I already picked, the other player's options are restricted (handled on their side)
      // But I can still switch freely
    }
    return false;
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Room Header */}
      <div className="glass rounded-2xl p-5 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Room Code</p>
        <h2 className="text-3xl font-heading font-bold tracking-widest text-primary">
          #{room.code}
        </h2>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>{room.max_players}P Mode</span>
          <span>•</span>
          <CoinBalance amount={room.bet_amount} size="sm" />
          <span>•</span>
          <span className="text-xs text-muted-foreground">Pot:</span>
          <CoinBalance amount={room.bet_amount * room.max_players} size="sm" />
        </div>
      </div>

      {/* Color Selection */}
      {currentPlayer && !isGameStarted && (
        <div className="glass rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-heading font-bold text-muted-foreground uppercase tracking-wider">
            Choose Your Color
          </h3>
          <div className="flex justify-center gap-3">
            {PLAYER_COLORS.map((color, idx) => {
              const isDisabled = getDisabledColors(idx);
              const isSelected = myColor === idx;
              return (
                <button
                  key={idx}
                  onClick={() => !isDisabled && onSelectColor?.(idx)}
                  disabled={isDisabled}
                  className={cn(
                    "w-12 h-12 rounded-full border-3 transition-all flex items-center justify-center",
                    isSelected && "ring-2 ring-offset-2 ring-foreground scale-110",
                    isTaken && "opacity-30 cursor-not-allowed",
                    !isTaken && !isSelected && "hover:scale-105 cursor-pointer"
                  )}
                  style={{
                    backgroundColor: color,
                    borderColor: isSelected ? "white" : "transparent",
                  }}
                >
                  {isSelected && <Check className="w-5 h-5 text-white" />}
                  {isTaken && <X className="w-5 h-5 text-white" />}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {myColor != null ? `You are ${PLAYER_NAMES[myColor]}` : "Pick a color to play"}
          </p>
        </div>
      )}

      {/* Players List */}
      <div className="space-y-2">
        <h3 className="text-sm font-heading font-bold text-muted-foreground uppercase tracking-wider">
          Players ({room.players.length}/{room.max_players})
        </h3>
        {Array.from({ length: room.max_players }).map((_, i) => {
          const player = room.players[i];
          const playerColor = player?.color_index != null ? PLAYER_COLORS[player.color_index] : undefined;
          return (
            <div
              key={i}
              className={cn(
                "glass rounded-xl p-4 flex items-center justify-between transition-all",
                player ? "border border-border/50" : "border border-dashed border-border/30 opacity-50"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-sm"
                  )}
                  style={{
                    backgroundColor: playerColor || (player ? "hsl(var(--primary) / 0.2)" : "hsl(var(--muted))"),
                    color: playerColor ? "white" : (player ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"),
                  }}
                >
                  {player ? (player.display_name?.[0] || "P") : "?"}
                </div>
                <div>
                  <p className="font-heading font-bold flex items-center gap-1.5">
                    {player?.display_name || "Waiting..."}
                    {player && player.user_id === room.created_by && (
                      <Crown className="w-3.5 h-3.5 text-accent" />
                    )}
                    {player?.color_index != null && (
                      <span className="text-xs font-normal" style={{ color: PLAYER_COLORS[player.color_index] }}>
                        ({PLAYER_NAMES[player.color_index]})
                      </span>
                    )}
                  </p>
                  {player && (
                    <p className="text-xs text-muted-foreground">
                      {player.user_id === user?.id ? "You" : "Player"}
                    </p>
                  )}
                </div>
              </div>
              {player && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
                    player.is_ready
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {player.is_ready ? (
                    <>
                      <Check className="w-3 h-3" /> Ready
                    </>
                  ) : (
                    <>
                      <X className="w-3 h-3" /> Not Ready
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {!isGameStarted && currentPlayer && (
          <Button
            onClick={onReady}
            disabled={myColor == null}
            className={cn(
              "w-full font-heading font-bold text-lg py-6",
              currentPlayer.is_ready
                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                : "bg-gradient-primary text-primary-foreground shadow-glow"
            )}
          >
            {myColor == null ? "Select a color first" : currentPlayer.is_ready ? "Cancel Ready" : "I'm Ready!"}
          </Button>
        )}

        {onFillBots && !isGameStarted && room.players.length < room.max_players && (
          <Button
            variant="outline"
            onClick={onFillBots}
            className="w-full font-heading font-bold border-dashed border-accent text-accent"
          >
            <Bot className="w-4 h-4 mr-2" />
            Fill with Bots (Dev)
          </Button>
        )}

        {isCreator && allReady && !isGameStarted && (
          <Button
            onClick={onStart}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-heading font-bold text-lg py-6 animate-pulse"
          >
            🎲 Start Game!
          </Button>
        )}

        {!isGameStarted && (
          <Button
            variant="ghost"
            onClick={onLeave}
            className="w-full text-destructive hover:text-destructive/80 font-heading"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Leave Room
          </Button>
        )}

        {isGameStarted && (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-lg font-heading font-bold text-primary animate-pulse">
              🎲 Game in Progress...
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Ludo board coming soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomLobby;
