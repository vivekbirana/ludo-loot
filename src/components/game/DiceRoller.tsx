import { useState, useEffect, useRef } from "react";
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { playDiceRollSound } from "@/utils/sounds";

const diceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

interface DiceRollerProps {
  value: number | null;
  onRoll: () => void;
  canRoll: boolean;
  rolling?: boolean;
}

const DiceRoller = ({ value, onRoll, canRoll, rolling }: DiceRollerProps) => {
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

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={cn(
          "w-16 h-16 rounded-xl flex items-center justify-center transition-all",
          "bg-secondary border border-border",
          rolling && "animate-bounce",
          value === 6 && !rolling && "border-accent shadow-[0_0_12px_hsl(45,90%,50%,0.4)]"
        )}
      >
        <DiceIcon className={cn("w-10 h-10 transition-transform", value || rolling ? "text-foreground" : "text-muted-foreground", rolling && "scale-110")} />
      </div>
      {canRoll && (
        <Button
          onClick={onRoll}
          disabled={rolling}
          className="bg-gradient-primary font-heading font-bold text-primary-foreground shadow-glow px-8"
        >
          🎲 Roll Dice
        </Button>
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
