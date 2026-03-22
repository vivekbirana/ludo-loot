import { PLAYER_COLORS, PLAYER_NAMES, GameState } from "@/game/ludoEngine";
import { cn } from "@/lib/utils";
import { Crown } from "lucide-react";

interface PlayerInfoBarProps {
  gameState: GameState;
  playerNames: string[];
  currentPlayerId: number | null;
}

const PlayerInfoBar = ({ gameState, playerNames, currentPlayerId }: PlayerInfoBarProps) => {
  const getSeatColorIndex = (seat: number) => gameState.colorOrder?.[seat] ?? seat;

  return (
    <div className="flex gap-2">
      {Array.from({ length: gameState.playerCount }).map((_, idx) => {
        const colorIdx = getSeatColorIndex(idx);
        const color = PLAYER_COLORS[colorIdx];
        const isActive = gameState.currentTurn === idx;
        const finishedCount = gameState.tokens[idx].filter((t) => t.position === "finished").length;
        const isWinner = gameState.winner === idx;
        const isMe = currentPlayerId === idx;

        return (
          <div
            key={idx}
            className={cn(
              "flex-1 rounded-lg p-2 text-center transition-all border",
              isActive
                ? "border-foreground/30 scale-105"
                : "border-transparent opacity-60",
              isWinner && "ring-2 ring-accent"
            )}
            style={{
              backgroundColor: `${color}15`,
              borderColor: isActive ? color : undefined,
            }}
          >
            <div className="flex items-center justify-center gap-1">
              {isWinner && <Crown className="w-3 h-3 text-accent" />}
              <p
                className="text-xs font-heading font-bold truncate"
                style={{ color }}
              >
                {playerNames[idx] || PLAYER_NAMES[colorIdx]}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isMe ? "You" : ""} {finishedCount}/4
            </p>
            <div className="flex justify-center gap-0.5 mt-1">
              {gameState.tokens[idx].map((token, ti) => (
                <div
                  key={ti}
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: color,
                    opacity: token.position === "finished" ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PlayerInfoBar;
