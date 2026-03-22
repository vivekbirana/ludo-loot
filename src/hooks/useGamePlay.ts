import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  GameState,
  createInitialGameState,
  rollDice,
  getMovableTokens,
  moveToken,
  getIntermediateSteps,
  PLAYER_NAMES,
} from "@/game/ludoEngine";
import { smartRollDice } from "@/game/smartDice";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { playDiceRollSound, playTokenMoveSound } from "@/utils/sounds";

export interface MoveLog {
  id: number;
  playerName: string;
  colorIndex: number;
  dice: number;
  action: string; // e.g. "rolled 6, moved token out", "rolled 3, moved token"
  timestamp: number;
}

let logIdCounter = 0;

export function useGamePlay(roomId: string | null) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [rolling, setRolling] = useState(false);
  const [turnTimer, setTurnTimer] = useState(30);
  const [isSpectator, setIsSpectator] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [betAmount, setBetAmount] = useState(0);
  const [moveLogs, setMoveLogs] = useState<MoveLog[]>([]);
  const animatingRef = useRef(false);
  const botPlayingRef = useRef(false);
  const playerNamesRef = useRef<string[]>([]);
  const gameStateRef = useRef<GameState | null>(null);

  // Keep refs in sync
  useEffect(() => {
    playerNamesRef.current = playerNames;
  }, [playerNames]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const addLog = useCallback((playerSeat: number, dice: number, action: string, state: GameState) => {
    const colorIdx = state.colorOrder?.[playerSeat] ?? playerSeat;
    const name = playerNamesRef.current[playerSeat] || PLAYER_NAMES[colorIdx];
    setMoveLogs((prev) => {
      const newLog: MoveLog = {
        id: ++logIdCounter,
        playerName: name,
        colorIndex: colorIdx,
        dice,
        action,
        timestamp: Date.now(),
      };
      return [newLog, ...prev].slice(0, 50); // Keep last 50 logs
    });
  }, []);

  const loadGameState = useCallback(async () => {
    if (!roomId) return;

    const { data: room } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (room) {
      setRoomCode(room.code);
      setBetAmount(room.bet_amount);
    }

    const { data: players } = await supabase
      .from("room_players")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    const userIds = (players || []).map((p) => p.user_id);
    const { data: profiles } = userIds.length
      ? await supabase
          .from("profiles")
          .select("user_id, display_name, phone")
          .in("user_id", userIds)
      : { data: [] as Array<{ user_id: string; display_name: string | null; phone: string }> };

    const getPlayerColor = (player: any, fallbackIndex: number) =>
      player.color_index ?? fallbackIndex;

    const applyPlayerSeatMeta = (colorOrder: number[]) => {
      const names = Array.from({ length: colorOrder.length }, () => "");
      let mySeat: number | null = null;

      (players || []).forEach((p, idx) => {
        const profile = profiles?.find((pr) => pr.user_id === p.user_id);
        const name = profile
          ? profile.display_name || profile.phone.slice(-4)
          : "Bot";
        const colorIdx = getPlayerColor(p, idx);
        const seatIdx = colorOrder.indexOf(colorIdx);

        if (seatIdx >= 0) {
          names[seatIdx] = name;
          if (p.user_id === user?.id) mySeat = seatIdx;
        }
      });

      setPlayerNames(names);
      setPlayerIndex(mySeat);
      setIsSpectator(mySeat === null);
    };

    const { data: existingState } = await supabase
      .from("game_states")
      .select("*")
      .eq("room_id", roomId)
      .single();

    if (existingState) {
      const parsedRaw = existingState.token_positions as unknown as Partial<GameState>;
      const resolvedPlayerCount =
        typeof parsedRaw.playerCount === "number"
          ? parsedRaw.playerCount
          : players?.length || 2;

      const colorOrderFromPlayers = (players || [])
        .slice(0, resolvedPlayerCount)
        .map((p, idx) => getPlayerColor(p, idx));

      const resolvedColorOrder =
        Array.isArray(parsedRaw.colorOrder) &&
        parsedRaw.colorOrder.length === resolvedPlayerCount
          ? parsedRaw.colorOrder
          : colorOrderFromPlayers.length === resolvedPlayerCount
            ? colorOrderFromPlayers
            : Array.from({ length: resolvedPlayerCount }, (_, i) => i);

      const fallbackInitial = createInitialGameState(
        resolvedPlayerCount,
        resolvedColorOrder
      );

      const resolvedCurrentTurn =
        typeof parsedRaw.currentTurn === "number" &&
        parsedRaw.currentTurn >= 0 &&
        parsedRaw.currentTurn < resolvedPlayerCount
          ? parsedRaw.currentTurn
          : fallbackInitial.currentTurn;

      const parsed: GameState = {
        tokens: parsedRaw.tokens || fallbackInitial.tokens,
        colorOrder: resolvedColorOrder,
        currentTurn: resolvedCurrentTurn,
        diceValue:
          typeof parsedRaw.diceValue === "number" ? parsedRaw.diceValue : null,
        turnPhase:
          parsedRaw.turnPhase === "moving" || parsedRaw.turnPhase === "finished"
            ? parsedRaw.turnPhase
            : "rolling",
        consecutiveSixes:
          typeof parsedRaw.consecutiveSixes === "number"
            ? parsedRaw.consecutiveSixes
            : 0,
        winner:
          typeof parsedRaw.winner === "number" ? parsedRaw.winner : null,
        playerCount: resolvedPlayerCount,
        skipCounts: Array.isArray(parsedRaw.skipCounts)
          ? parsedRaw.skipCounts
          : Array(resolvedPlayerCount).fill(0),
      };

      setGameState(parsed);
      applyPlayerSeatMeta(parsed.colorOrder);
    } else if (room && user && room.created_by === user.id) {
      const playerCount = players?.length || 2;
      const colorOrder = (players || [])
        .slice(0, playerCount)
        .map((p, idx) => getPlayerColor(p, idx));

      const initial = createInitialGameState(playerCount, colorOrder);

      const { error } = await supabase.from("game_states").insert([
        {
          room_id: roomId,
          current_turn: initial.currentTurn,
          turn_phase: initial.turnPhase,
          token_positions: initial as unknown as Json,
          turn_start_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error("Failed to create game state:", error);
      } else {
        setGameState(initial);
        applyPlayerSeatMeta(initial.colorOrder);
      }
    }
  }, [roomId, user]);

  useEffect(() => {
    loadGameState();
  }, [loadGameState]);

  // Poll for game state if not loaded yet (handles case where player 2 loads before creator inserts state)
  useEffect(() => {
    if (!roomId || gameState) return;

    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from("game_states")
        .select("*")
        .eq("room_id", roomId)
        .single();

      if (data) {
        clearInterval(pollInterval);
        loadGameState();
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [roomId, gameState, loadGameState]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`game-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_states",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newState = payload.new as Record<string, unknown>;
          if (newState?.token_positions) {
            const incoming = newState.token_positions as unknown as GameState;
            // Don't overwrite local state during animation or bot turns
            if (!animatingRef.current && !botPlayingRef.current) {
              setGameState(incoming);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Auto-trigger bot turn whenever gameState changes and it's bot's turn
  useEffect(() => {
    if (!gameState || gameState.turnPhase === "finished" || gameState.winner !== null) return;
    if (gameState.turnPhase !== "rolling") return;
    if (botPlayingRef.current) return;

    const names = playerNamesRef.current;
    const currentName = names[gameState.currentTurn];
    if (currentName === "Bot") {
      botPlayingRef.current = true;
      // Capture the current state to avoid stale closures
      const capturedState = { ...gameState };
      const timer = setTimeout(() => {
        playBotTurn(capturedState).finally(() => {
          botPlayingRef.current = false;
        });
      }, 1000);
      return () => {
        clearTimeout(timer);
        botPlayingRef.current = false;
      };
    }
  }, [gameState?.currentTurn, gameState?.turnPhase, gameState?.diceValue]);

  // Turn timer - only for human players
  useEffect(() => {
    if (!gameState || gameState.turnPhase === "finished") return;

    const currentName = playerNamesRef.current[gameState.currentTurn];
    if (currentName === "Bot") return;

    setTurnTimer(30);
    const interval = setInterval(() => {
      setTurnTimer((prev) => {
        if (prev <= 1) {
          if (playerIndex === gameState.currentTurn) {
            handleAutoSkip();
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState?.currentTurn, gameState?.turnPhase]);

  const handleAutoSkip = async () => {
    if (!gameState || !roomId) return;

    const MAX_SKIPS = 5;
    const skipCounts = [...(gameState.skipCounts || Array(gameState.playerCount).fill(0))];
    skipCounts[gameState.currentTurn] = (skipCounts[gameState.currentTurn] || 0) + 1;

    addLog(gameState.currentTurn, 0, `timed out (${skipCounts[gameState.currentTurn]}/${MAX_SKIPS})`, gameState);

    // Auto-forfeit: if player skipped 5 times, opponent wins
    if (skipCounts[gameState.currentTurn] >= MAX_SKIPS) {
      const winnerSeat = (gameState.currentTurn + 1) % gameState.playerCount;
      const forfeitState: GameState = {
        ...gameState,
        turnPhase: "finished",
        winner: winnerSeat,
        diceValue: null,
        skipCounts,
      };

      addLog(gameState.currentTurn, 0, "auto-forfeited (5 skips)", gameState);
      toast.error("Player auto-forfeited after 5 missed turns!");
      await saveGameState(forfeitState);
      // Also mark room as finished
      await supabase.from("game_rooms").update({ status: "finished" }).eq("id", roomId);
      return;
    }

    const newState: GameState = {
      ...gameState,
      currentTurn: (gameState.currentTurn + 1) % gameState.playerCount,
      turnPhase: "rolling",
      diceValue: null,
      consecutiveSixes: 0,
      skipCounts,
    };

    await saveGameState(newState);
  };

  const saveGameState = async (newState: GameState) => {
    if (!roomId) return;

    setGameState(newState);

    await supabase
      .from("game_states")
      .update({
        current_turn: newState.currentTurn,
        turn_phase: newState.turnPhase,
        dice_value: newState.diceValue,
        token_positions: newState as unknown as Json,
        turn_start_at: new Date().toISOString(),
      })
      .eq("room_id", roomId);

    if (newState.turnPhase === "finished" || newState.winner !== null) {
      await supabase
        .from("game_rooms")
        .update({ status: "finished" })
        .eq("id", roomId);
    }
  };

  const animateTokenMove = async (
    baseState: GameState,
    tokenIndex: number
  ): Promise<GameState> => {
    const steps = getIntermediateSteps(baseState, tokenIndex);
    animatingRef.current = true;

    for (const stepState of steps) {
      setGameState(stepState);
      playTokenMoveSound();
      await new Promise((r) => setTimeout(r, 150));
    }

    const finalState = moveToken(baseState, tokenIndex);
    animatingRef.current = false;
    return finalState;
  };

  const describeMove = (state: GameState, tokenIndex: number, dice: number): string => {
    const token = state.tokens[state.currentTurn][tokenIndex];
    if (token.position === "home" && dice === 6) {
      return `rolled ${dice}, moved token out`;
    }
    return `rolled ${dice}, moved token ${dice} steps`;
  };

  const handleRollDice = async () => {
    if (!gameState || playerIndex === null || isSpectator) return;
    if (gameState.currentTurn !== playerIndex) return;
    if (gameState.turnPhase !== "rolling") return;

    setRolling(true);
    await new Promise((r) => setTimeout(r, 600));

    const dice = smartRollDice(gameState, playerIndex);
    // Reset skip count for this player since they actively played
    const skipCounts = [...(gameState.skipCounts || Array(gameState.playerCount).fill(0))];
    skipCounts[playerIndex] = 0;
    const diceState: GameState = { ...gameState, diceValue: dice, turnPhase: "moving", skipCounts };
    await saveGameState(diceState);
    setRolling(false);

    const movable = getMovableTokens(diceState);
    if (movable.length === 0) {
      addLog(playerIndex, dice, `rolled ${dice}, no moves`, diceState);
      await new Promise((r) => setTimeout(r, 500));
      const newState: GameState = {
        ...diceState,
        currentTurn: (diceState.currentTurn + 1) % diceState.playerCount,
        turnPhase: "rolling",
        diceValue: null,
        consecutiveSixes: 0,
      };
      await saveGameState(newState);
    } else if (movable.length === 1) {
      addLog(playerIndex, dice, describeMove(diceState, movable[0], dice), diceState);
      const finalState = await animateTokenMove(diceState, movable[0]);
      await saveGameState(finalState);
    }
    // If movable.length > 1, wait for user to pick a token
  };

  const handleTokenClick = async (tokenIndex: number) => {
    if (!gameState || playerIndex === null || isSpectator) return;
    if (gameState.currentTurn !== playerIndex) return;
    if (gameState.turnPhase !== "moving") return;

    const movable = getMovableTokens(gameState);
    if (!movable.includes(tokenIndex)) return;

    addLog(playerIndex, gameState.diceValue || 0, describeMove(gameState, tokenIndex, gameState.diceValue || 0), gameState);
    const finalState = await animateTokenMove(gameState, tokenIndex);
    await saveGameState(finalState);
  };

  const playBotTurn = async (state: GameState) => {
    // Use the passed state directly, not gameState from closure
    playDiceRollSound(500);
    await new Promise((r) => setTimeout(r, 600));
    const dice = smartRollDice(state, state.currentTurn);
    const diceState: GameState = { ...state, diceValue: dice, turnPhase: "moving" };
    await saveGameState(diceState);

    await new Promise((r) => setTimeout(r, 400));

    const movable = getMovableTokens(diceState);
    if (movable.length === 0) {
      addLog(state.currentTurn, dice, `rolled ${dice}, no moves`, diceState);
      const newState: GameState = {
        ...diceState,
        currentTurn: (diceState.currentTurn + 1) % diceState.playerCount,
        turnPhase: "rolling",
        diceValue: null,
        consecutiveSixes: 0,
      };
      await saveGameState(newState);
    } else {
      const chosen = movable[Math.floor(Math.random() * movable.length)];
      addLog(state.currentTurn, dice, describeMove(diceState, chosen, dice), diceState);
      const finalState = await animateTokenMove(diceState, chosen);
      await saveGameState(finalState);
    }
  };

  const handleQuitGame = async () => {
    if (!roomId || !user || !gameState) return;

    // Mark the game as finished with opponent as winner
    if (playerIndex !== null) {
      const winnerSeat = (playerIndex + 1) % gameState.playerCount;
      const forfeitState: GameState = {
        ...gameState,
        turnPhase: "finished",
        winner: winnerSeat,
        diceValue: null,
      };
      await saveGameState(forfeitState);
    }

    // Update room status to finished
    await supabase
      .from("game_rooms")
      .update({ status: "finished" })
      .eq("id", roomId);

    await supabase
      .from("room_players")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", user.id);

    toast.info("You left the game and forfeited your bet.");
  };

  return {
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
  };
}
