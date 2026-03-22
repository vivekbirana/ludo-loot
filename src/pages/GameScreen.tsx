import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, Timer, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import LudoBoard from "@/components/game/LudoBoard";
import DiceRoller from "@/components/game/DiceRoller";
import PlayerInfoBar from "@/components/game/PlayerInfoBar";
import { useGamePlay } from "@/hooks/useGamePlay";
import { PLAYER_COLORS, PLAYER_NAMES } from "@/game/ludoEngine";

const GameScreen = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const {
    gameState,
    playerIndex,
    playerNames,
    rolling,
    turnTimer,
    isSpectator,
    roomCode,
    betAmount,
    handleRollDice,
    handleTokenClick,
    handleQuitGame,
  } = useGamePlay(roomId || null);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getSeatColorIndex = (seat: number) => gameState.colorOrder?.[seat] ?? seat;
  const isMyTurn = playerIndex !== null && gameState.currentTurn === playerIndex;
  const currentTurnColorIndex = getSeatColorIndex(gameState.currentTurn);
  const currentTurnColor = PLAYER_COLORS[currentTurnColorIndex];
  const currentTurnLabel = playerNames[gameState.currentTurn] || PLAYER_NAMES[currentTurnColorIndex];
  const isFinished = gameState.turnPhase === "finished";

  const onQuit = async () => {
    await handleQuitGame();
    navigate("/play");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        {isSpectator ? (
          <Button variant="ghost" size="sm" onClick={() => navigate("/play")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive">
                <LogOut className="w-4 h-4 mr-1" />
                Quit
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Quit Game?</AlertDialogTitle>
                <AlertDialogDescription>
                  If you quit, you will lose your bet of <strong>{betAmount} coins</strong>. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Stay</AlertDialogCancel>
                <AlertDialogAction onClick={onQuit} className="bg-destructive text-destructive-foreground">
                  Quit & Forfeit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-heading">#{roomCode}</span>
          {isSpectator && (
            <span className="flex items-center gap-1 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
              <Eye className="w-3 h-3" />
              Spectating
            </span>
          )}
        </div>
      </div>

      {/* Player Info */}
      <div className="px-4 pb-2">
        <PlayerInfoBar
          gameState={gameState}
          playerNames={playerNames}
          currentPlayerId={playerIndex}
        />
      </div>

      {/* Turn indicator + timer */}
      {!isFinished && (
        <div className="flex items-center justify-center gap-3 py-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: currentTurnColor }}
          />
          <span className="text-sm font-heading font-bold" style={{ color: currentTurnColor }}>
            {isMyTurn ? "Your Turn!" : `${currentTurnLabel}'s Turn`}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Timer className="w-3 h-3" />
            {turnTimer}s
          </span>
        </div>
      )}

      {/* Board */}
      <div className="flex-1 flex items-center justify-center px-4">
        <LudoBoard
          gameState={gameState}
          currentPlayerId={playerIndex}
          onTokenClick={handleTokenClick}
          isSpectator={isSpectator}
        />
      </div>

      {/* Dice + Controls */}
      <div className="px-4 py-4">
        {isFinished ? (
          <div className="glass rounded-xl p-6 text-center space-y-3">
            <h2 className="text-2xl font-heading font-bold">
              🏆 {playerNames[gameState.winner!] || PLAYER_NAMES[getSeatColorIndex(gameState.winner!)]} Wins!
            </h2>
            <p className="text-muted-foreground text-sm">
              {gameState.winner === playerIndex ? "Congratulations! You won!" : "Better luck next time!"}
            </p>
            <Button
              onClick={() => navigate("/play")}
              className="bg-gradient-primary font-heading font-bold text-primary-foreground"
            >
              Back to Lobby
            </Button>
          </div>
        ) : !isSpectator ? (
          <DiceRoller
            value={gameState.diceValue}
            onRoll={handleRollDice}
            canRoll={isMyTurn && gameState.turnPhase === "rolling"}
            rolling={rolling}
          />
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            <p>Watching the game...</p>
            {gameState.diceValue && (
              <p className="text-lg font-heading font-bold mt-1">Dice: {gameState.diceValue}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameScreen;
