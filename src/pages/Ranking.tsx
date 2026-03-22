import { Trophy, Medal, Crown } from "lucide-react";
import CoinBalance from "@/components/CoinBalance";
import { cn } from "@/lib/utils";

const mockLeaderboard = [
  { rank: 1, name: "Rahul K.", wins: 45, earnings: 12500 },
  { rank: 2, name: "Priya S.", wins: 38, earnings: 9800 },
  { rank: 3, name: "Amit R.", wins: 32, earnings: 8200 },
  { rank: 4, name: "Sneha M.", wins: 28, earnings: 7100 },
  { rank: 5, name: "Vikram P.", wins: 25, earnings: 6300 },
  { rank: 6, name: "Neha D.", wins: 22, earnings: 5500 },
  { rank: 7, name: "Arjun T.", wins: 19, earnings: 4800 },
  { rank: 8, name: "Pooja L.", wins: 17, earnings: 4200 },
];

const rankIcons = {
  1: Crown,
  2: Medal,
  3: Trophy,
};

const rankColors = {
  1: "text-accent",
  2: "text-foreground/70",
  3: "text-orange-400",
};

const Ranking = () => {
  return (
    <div className="px-4 pt-6 space-y-6">
      <h1 className="text-2xl font-heading font-bold">Leaderboard</h1>

      {/* Top 3 Podium */}
      <div className="flex items-end justify-center gap-3 py-4">
        {[2, 1, 3].map((rank) => {
          const player = mockLeaderboard.find((p) => p.rank === rank)!;
          const RankIcon = rankIcons[rank as keyof typeof rankIcons];
          const heights = { 1: "h-28", 2: "h-20", 3: "h-16" };
          return (
            <div key={rank} className="flex flex-col items-center gap-2">
              <RankIcon className={cn("w-6 h-6", rankColors[rank as keyof typeof rankColors])} />
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-heading font-bold text-sm">
                {player.name.charAt(0)}
              </div>
              <p className="text-xs font-medium truncate max-w-[80px]">{player.name}</p>
              <div className={cn(
                "w-20 rounded-t-lg bg-gradient-card flex items-center justify-center border border-border/50",
                heights[rank as keyof typeof heights]
              )}>
                <span className={cn("text-2xl font-heading font-bold", rankColors[rank as keyof typeof rankColors])}>
                  #{rank}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full list */}
      <div className="space-y-2">
        {mockLeaderboard.map((player) => (
          <div key={player.rank} className="glass rounded-xl p-3 flex items-center gap-3 animate-slide-up">
            <span className={cn(
              "w-8 text-center font-heading font-bold text-lg",
              player.rank <= 3 ? rankColors[player.rank as keyof typeof rankColors] : "text-muted-foreground"
            )}>
              {player.rank}
            </span>
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-heading font-bold text-sm">
              {player.name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-heading font-bold text-sm">{player.name}</p>
              <p className="text-xs text-muted-foreground">{player.wins} wins</p>
            </div>
            <CoinBalance amount={player.earnings} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Ranking;
