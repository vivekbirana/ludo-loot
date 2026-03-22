import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, Timer, LogOut, ScrollText } from "lucide-react";
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
import { useState } from "react";

const GameScreen = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [showLogs, setShowLogs] = useState(false);
  const {
    gameState,
    playerIndex,
    playerNames,
    rolling,
    turnTimer,
    isSpectator,
    roomCode,
    betAmount,
    moveLogs,
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLogs((v) => !v)}
            className="text-muted-foreground"
          >
            <ScrollText className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground font-heading">#{roomCode}</span>
          {isSpectator && (
            <span className="flex items-center gap-1 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
              <Eye className="w-3 h-3" />
              Spectating
            </span>
          )}
        </div>
      </div>

      {/* Move Logs Panel */}
      {showLogs && (
        <div className="mx-4 mb-2 glass rounded-lg p-2 max-h-32 overflow-y-auto">
          <p className="text-xs font-heading font-bold text-muted-foreground mb-1">Move Log</p>
          {moveLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No moves yet</p>
          ) : (
            moveLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-2 text-xs py-0.5">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PLAYER_COLORS[log.colorIndex] }}
                />
                <span className="font-medium" style={{ color: PLAYER_COLORS[log.colorIndex] }}>
                  {log.playerName}
                </span>
                <span className="text-muted-foreground">{log.action}</span>
              </div>
            ))
          )}
        </div>
      )}



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
      <div className="px-4 py-4 min-h-[140px] flex items-center justify-center">
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
            turnColor={currentTurnColor}
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
