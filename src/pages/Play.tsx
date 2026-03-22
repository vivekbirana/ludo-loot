import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RoomCard from "@/components/RoomCard";
import RoomLobby from "@/components/RoomLobby";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import CoinBalance from "@/components/CoinBalance";
import { cn } from "@/lib/utils";
import { useGameRooms } from "@/hooks/useGameRooms";

const betAmounts = [50, 100, 200, 500];
const playerModes = [2, 3, 4];

const Play = () => {
  const [selectedBet, setSelectedBet] = useState(100);
  const [selectedMode, setSelectedMode] = useState(2);
  const [roomCode, setRoomCode] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    rooms,
    currentRoom,
    loading,
    createRoom,
    joinRoom,
    joinByCode,
    toggleReady,
    leaveRoom,
    startGame,
    fillWithBots,
  } = useGameRooms();

  const handleCreateRoom = async () => {
    await createRoom(selectedBet, selectedMode);
    setDialogOpen(false);
  };

  const handleJoinByCode = async () => {
    await joinByCode(roomCode);
    setRoomCode("");
  };

  // Show lobby if user is in a room
  if (currentRoom) {
    return (
      <div className="px-4 pt-6">
        <RoomLobby
          room={currentRoom}
          onReady={toggleReady}
          onLeave={leaveRoom}
          onStart={startGame}
          onFillBots={fillWithBots}
        />
      </div>
    );
  }

  const waitingRooms = rooms.filter((r) => r.status === "waiting");

  return (
    <div className="px-4 pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold">Play</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary font-heading font-bold text-primary-foreground shadow-glow">
              <Plus className="w-4 h-4 mr-1" />
              Create Room
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-border/50 max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Create Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Bet Amount</label>
                <div className="grid grid-cols-4 gap-2">
                  {betAmounts.map((bet) => (
                    <button
                      key={bet}
                      onClick={() => setSelectedBet(bet)}
                      className={cn(
                        "rounded-lg p-2 text-center border transition-all",
                        selectedBet === bet
                          ? "border-primary bg-primary/10 shadow-glow"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <CoinBalance amount={bet} size="sm" className="justify-center" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Players</label>
                <div className="grid grid-cols-3 gap-2">
                  {playerModes.map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSelectedMode(mode)}
                      className={cn(
                        "rounded-lg p-3 text-center border transition-all font-heading font-bold",
                        selectedMode === mode
                          ? "border-primary bg-primary/10 shadow-glow"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {mode}P
                    </button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full bg-gradient-primary font-heading font-bold text-primary-foreground shadow-glow"
                onClick={handleCreateRoom}
              >
                Create & Wait
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Join by code */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Enter room code..."
            className="pl-9 bg-secondary border-border"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
        </div>
        <Button
          variant="outline"
          className="font-heading font-bold"
          disabled={roomCode.length < 4}
          onClick={handleJoinByCode}
        >
          Join
        </Button>
      </div>

      {/* Room list */}
      <div className="space-y-3">
        <h2 className="text-lg font-heading font-bold">Open Rooms</h2>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading rooms...</p>
        ) : waitingRooms.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-muted-foreground">No open rooms. Create one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {waitingRooms.map((room) => (
              <RoomCard
                key={room.id}
                code={room.code}
                betAmount={room.bet_amount}
                playerCount={room.players.length}
                maxPlayers={room.max_players}
                status={room.status as "waiting" | "in_progress" | "finished"}
                onJoin={() => joinRoom(room.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Play;
