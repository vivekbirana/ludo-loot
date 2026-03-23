import { useState, useEffect, useRef, memo } from "react";
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from "lucide-react";
import { cn } from "@/lib/utils";
import { playDiceRollSound } from "@/utils/sounds";

const diceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

interface DiceRollerProps {
  value: number | null;
  onRoll: () => void;
  canRoll: boolean;
  rolling?: boolean;
  turnColor?: string;
}

const DiceRoller = ({ value, onRoll, canRoll, rolling, turnColor }: DiceRollerProps) => {
  const [animFace, setAnimFace] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (rolling) {
      playDiceRollSound(600);
      let i = 0;
      intervalRef.current = setInterval(() => {
        setAnimFace(i % 6);
        i++;
      }, 70);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [rolling]);

  const displayFace = rolling ? animFace : (value ? value - 1 : 0);
  const DiceIcon = diceIcons[displayFace];

  const borderColor = turnColor || "hsl(var(--border))";

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        onClick={canRoll && !rolling ? onRoll : undefined}
        className={cn(
          "w-20 h-20 rounded-xl flex items-center justify-center transition-all",
          "bg-secondary",
          rolling && "animate-bounce",
          canRoll && !rolling && "cursor-pointer hover:scale-110 active:scale-95",
          !canRoll && "opacity-80",
          value === 6 && !rolling && "shadow-[0_0_16px_hsl(45,90%,50%,0.5)]"
        )}
        style={{ border: `3px solid ${borderColor}` }}
      >
        <DiceIcon
          className={cn(
            "w-14 h-14 transition-transform",
            value || rolling ? "text-foreground" : "text-muted-foreground",
            rolling && "scale-110"
          )}
        />
      </div>
      {canRoll && !rolling && (
        <p className="text-xs text-muted-foreground font-heading animate-pulse">Tap to roll</p>
      )}
      {!canRoll && value && !rolling && (
        <p className="text-sm text-muted-foreground font-heading">
          {value === 6 ? "🔥 SIX! Pick a token" : "Pick a token to move"}
        </p>
      )}
    </div>
  );
};

export default DiceRoller;
