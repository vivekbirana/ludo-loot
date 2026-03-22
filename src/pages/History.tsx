import { Clock, Trophy, XCircle, Gamepad2 } from "lucide-react";
import CoinBalance from "@/components/CoinBalance";
import { cn } from "@/lib/utils";

const mockHistory = [
  { id: 1, result: "win", betAmount: 100, pot: 200, players: 2, date: "2 hours ago" },
  { id: 2, result: "loss", betAmount: 200, pot: 0, players: 4, date: "5 hours ago" },
  { id: 3, result: "win", betAmount: 50, pot: 150, players: 3, date: "1 day ago" },
  { id: 4, result: "loss", betAmount: 100, pot: 0, players: 2, date: "2 days ago" },
  { id: 5, result: "win", betAmount: 200, pot: 800, players: 4, date: "3 days ago" },
];

const History = () => {
  return (
    <div className="px-4 pt-6 space-y-6">
      <h1 className="text-2xl font-heading font-bold">Match History</h1>

      <div className="space-y-2">
        {mockHistory.map((match) => (
          <div key={match.id} className="glass rounded-xl p-4 flex items-center justify-between animate-slide-up">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                match.result === "win" ? "bg-primary/20" : "bg-destructive/20"
              )}>
                {match.result === "win" ? (
                  <Trophy className="w-5 h-5 text-primary" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div>
                <p className="font-heading font-bold">
                  {match.result === "win" ? "Victory!" : "Defeat"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{match.date}</span>
                  <span>•</span>
                  <span>{match.players}P</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              {match.result === "win" ? (
                <CoinBalance amount={match.pot} size="sm" />
              ) : (
                <span className="text-sm text-destructive font-heading font-bold">
                  -{match.betAmount}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {mockHistory.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-heading text-lg">No matches yet</p>
          <p className="text-sm">Play your first game!</p>
        </div>
      )}
    </div>
  );
};

export default History;
