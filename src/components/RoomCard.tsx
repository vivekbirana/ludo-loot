import { Users, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoinBalance from "./CoinBalance";
import { cn } from "@/lib/utils";

interface RoomCardProps {
  code: string;
  betAmount: number;
  playerCount: number;
  maxPlayers: number;
  status: "waiting" | "in_progress" | "finished";
  onJoin?: () => void;
}

const statusColors = {
  waiting: "text-primary",
  in_progress: "text-accent",
  finished: "text-muted-foreground",
};

const statusLabels = {
  waiting: "Waiting",
  in_progress: "Live",
  finished: "Finished",
};

const RoomCard = ({ code, betAmount, playerCount, maxPlayers, status, onJoin }: RoomCardProps) => {
  return (
    <div className="glass rounded-xl p-4 flex items-center justify-between animate-slide-up">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-heading font-bold text-lg">#{code}</span>
          <span className={cn("text-xs font-medium uppercase tracking-wider", statusColors[status])}>
            {status === "in_progress" && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent mr-1 animate-pulse" />
            )}
            {statusLabels[status]}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>{playerCount}/{maxPlayers}</span>
          </div>
          <div className="flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-accent" />
            <CoinBalance amount={betAmount} size="sm" />
          </div>
        </div>
      </div>
      {status === "waiting" && playerCount < maxPlayers && (
        <Button
          size="sm"
          className="bg-gradient-primary font-heading font-bold text-primary-foreground shadow-glow"
          onClick={onJoin}
        >
          Join
        </Button>
      )}
    </div>
  );
};

export default RoomCard;
