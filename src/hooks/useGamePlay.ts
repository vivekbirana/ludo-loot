import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  GameState,
  createInitialGameState,
  getMovableTokens,
  getIntermediateSteps,
  PLAYER_NAMES,
  START_POSITIONS,
  HOME_ENTRY_POSITIONS,
  SAFE_POSITIONS,
} from "@/game/ludoEngine";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { playDiceRollSound, playTokenMoveSound } from "@/utils/sounds";

export interface MoveLog {
  id: number;
  playerName: string;
  colorIndex: number;
  dice: number;
  action: string;
  timestamp: number;
}

let logIdCounter = Date.now();

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
  const rollingRef = useRef(false);
  const botPlayingRef = useRef(false);
  const playerNamesRef = useRef<string[]>([]);
  const gameStateRef = useRef<GameState | null>(null);
  const playerIndexRef = useRef<number | null>(null);

  // Keep refs in sync
  useEffect(() => { playerNamesRef.current = playerNames; }, [playerNames]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { playerIndexRef.current = playerIndex; }, [playerIndex]);

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
      return [newLog, ...prev].slice(0, 50);
    });
  }, []);

  // ── Edge function helper ──────────────────────────────────────
  const invokeGameAction = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("game-action", {
      body: { action, roomId, ...extra },
    });
    if (error) {
      console.error("game-action error:", error);
      toast.error("Game action failed. Please try again.");
      return null;
    }
    if (data?.error) {
      console.error("game-action validation error:", data.error);
      // Don't toast for expected validation errors like "Not your turn"
      return null;
    }
    return data;
  }, [roomId]);

  // ── Load game state ───────────────────────────────────────────
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

      const fallbackInitial = createInitialGameState(resolvedPlayerCount, resolvedColorOrder);

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
        diceValue: typeof parsedRaw.diceValue === "number" ? parsedRaw.diceValue : null,
        turnPhase:
          parsedRaw.turnPhase === "moving" || parsedRaw.turnPhase === "finished"
            ? parsedRaw.turnPhase
            : "rolling",
        consecutiveSixes: typeof parsedRaw.consecutiveSixes === "number" ? parsedRaw.consecutiveSixes : 0,
        winner: typeof parsedRaw.winner === "number" ? parsedRaw.winner : null,
        playerCount: resolvedPlayerCount,
        skipCounts: Array.isArray(parsedRaw.skipCounts) ? parsedRaw.skipCounts : Array(resolvedPlayerCount).fill(0),
      };

      setGameState(parsed);
      applyPlayerSeatMeta(parsed.colorOrder);
    } else {
      // Game state will be created by the server via init-game edge function
      // Poll until it appears
    }
  }, [roomId, user]);

  useEffect(() => { loadGameState(); }, [loadGameState]);

  // Poll for game state if not loaded yet
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

  // Realtime subscription
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`game-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_states", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newState = payload.new as Record<string, unknown>;
          if (newState?.token_positions) {
            const incoming = newState.token_positions as unknown as GameState;
            if (!animatingRef.current && !botPlayingRef.current && !rollingRef.current) {
              setGameState(incoming);
              if (playerIndexRef.current === null) {
                loadGameState();
              }
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // Auto-trigger bot turn
  useEffect(() => {
    if (!gameState || gameState.turnPhase === "finished" || gameState.winner !== null) return;
    if (gameState.turnPhase !== "rolling") return;
    if (botPlayingRef.current) return;

    const names = playerNamesRef.current;
    const currentName = names[gameState.currentTurn];
    if (currentName === "Bot") {
      botPlayingRef.current = true;
      const capturedState = { ...gameState };
      const timer = setTimeout(() => {
        playBotTurn(capturedState).finally(() => {
          botPlayingRef.current = false;
        });
      }, 1000);
      return () => { clearTimeout(timer); botPlayingRef.current = false; };
    }
  }, [gameState?.currentTurn, gameState?.turnPhase, gameState?.diceValue]);

  // Turn timer — only for human players
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

  // Match recording is now handled server-side in game-action edge function

  // ── Animation helper (visual only, no DB writes) ──────────────
  const animateTokenMove = async (baseState: GameState, tokenIndex: number): Promise<void> => {
    const steps = getIntermediateSteps(baseState, tokenIndex);
    animatingRef.current = true;
    for (const stepState of steps) {
      setGameState(stepState);
      playTokenMoveSound();
      await new Promise((r) => setTimeout(r, 220));
    }
    animatingRef.current = false;
  };

  // ── Describe move (for logging) ───────────────────────────────
  const describeMove = (state: GameState, tokenIndex: number, dice: number): string => {
    const token = state.tokens[state.currentTurn][tokenIndex];
    const colorIdx = state.colorOrder?.[state.currentTurn] ?? state.currentTurn;

    const detectCapture = (targetPathIndex: number): string => {
      if (SAFE_POSITIONS.has(targetPathIndex)) return "";
      for (let p = 0; p < state.playerCount; p++) {
        if (p === state.currentTurn) continue;
        const oppColor = state.colorOrder?.[p] ?? p;
        for (const oToken of state.tokens[p]) {
          if (oToken.position === "path" && oToken.pathIndex === targetPathIndex) {
            return ` 💥 captured ${PLAYER_NAMES[oppColor]}!`;
          }
        }
      }
      return "";
    };

    if (token.position === "home" && dice === 6) {
      const startPos = START_POSITIONS[colorIdx];
      const capture = detectCapture(startPos);
      return `rolled ${dice}, moved out → ${startPos}${capture}`;
    }
    if (token.position === "path") {
      const from = token.pathIndex;
      const homeEntry = HOME_ENTRY_POSITIONS[colorIdx];
      const distToHome = ((homeEntry - from + 52) % 52);
      if (distToHome > 0 && distToHome < dice) {
        const remaining = dice - distToHome;
        const homeIdx = remaining - 1;
        if (homeIdx >= 5) return `rolled ${dice}, ${from} → finished 🏠`;
        return `rolled ${dice}, ${from} → H${homeIdx}`;
      } else if (distToHome > 0 && distToHome === dice) {
        const capture = detectCapture(homeEntry);
        return `rolled ${dice}, ${from} → ${homeEntry}${capture}`;
      } else if (distToHome === 0) {
        const homeIdx = dice - 1;
        if (homeIdx >= 5) return `rolled ${dice}, ${from} → finished 🏠`;
        return `rolled ${dice}, ${from} → H${homeIdx}`;
      }
      const to = (from + dice) % 52;
      const capture = detectCapture(to);
      return `rolled ${dice}, ${from} → ${to}${capture}`;
    }
    if (token.position === "home_column") {
      const from = token.pathIndex;
      const to = Math.min(from + dice, 5);
      if (to >= 5) return `rolled ${dice}, H${from} → finished 🏠`;
      return `rolled ${dice}, H${from} → H${to}`;
    }
    return `rolled ${dice}, moved token`;
  };

  // ── Roll dice (server-side) ───────────────────────────────────
  const handleRollDice = async () => {
    if (!gameState || playerIndex === null || isSpectator) return;
    if (gameState.currentTurn !== playerIndex) return;
    if (gameState.turnPhase !== "rolling") return;

    setRolling(true);
    rollingRef.current = true;
    playDiceRollSound(500);
    await new Promise((r) => setTimeout(r, 600));

    const result = await invokeGameAction("roll");
    setRolling(false);
    rollingRef.current = false;

    if (!result) return;

    const dice = result.diceValue;

    if (result.autoMoved && result.movedTokenIndex !== undefined && result.stateBeforeMove) {
      // Single movable token — animate the auto-move
      addLog(playerIndex, dice, describeMove(result.stateBeforeMove, result.movedTokenIndex, dice), result.stateBeforeMove);
      setGameState(result.stateBeforeMove);
      await new Promise((r) => setTimeout(r, 300));
      await animateTokenMove(result.stateBeforeMove, result.movedTokenIndex);
      setGameState(result.state);
    } else if (result.movableTokens.length === 0) {
      // No moves
      addLog(playerIndex, dice, `rolled ${dice}, no moves`, gameState);
      setGameState({ ...gameState, diceValue: dice, turnPhase: "moving" });
      await new Promise((r) => setTimeout(r, 500));
      setGameState(result.state);
    } else {
      // Multiple choices — show dice, wait for token click
      setGameState(result.state);
    }

    // Prize distribution and match recording handled server-side
  };

  // ── Move token (server-side) ──────────────────────────────────
  const handleTokenClick = async (tokenIndex: number) => {
    if (!gameState || playerIndex === null || isSpectator) return;
    if (gameState.currentTurn !== playerIndex) return;
    if (gameState.turnPhase !== "moving") return;

    const movable = getMovableTokens(gameState);
    if (!movable.includes(tokenIndex)) return;

    addLog(playerIndex, gameState.diceValue || 0, describeMove(gameState, tokenIndex, gameState.diceValue || 0), gameState);

    const result = await invokeGameAction("move", { tokenIndex });
    if (!result) return;

    await animateTokenMove(gameState, tokenIndex);
    setGameState(result.state);

    // Prize distribution and match recording handled server-side
  };

  // ── Bot turn (server-side) ────────────────────────────────────
  const playBotTurn = async (state: GameState) => {
    playDiceRollSound(500);
    await new Promise((r) => setTimeout(r, 600));

    const result = await invokeGameAction("bot-turn");
    if (!result) return;

    const dice = result.diceValue;

    if (result.movedTokenIndex !== null && result.movedTokenIndex !== undefined && result.stateBeforeMove) {
      // Bot rolled and moved
      const diceState: GameState = { ...state, diceValue: dice, turnPhase: "moving" };
      setGameState(diceState);
      addLog(state.currentTurn, dice, describeMove(result.stateBeforeMove, result.movedTokenIndex, dice), result.stateBeforeMove);
      await new Promise((r) => setTimeout(r, 400));
      await animateTokenMove(result.stateBeforeMove, result.movedTokenIndex);
      setGameState(result.state);
    } else {
      // Bot rolled, no moves
      addLog(state.currentTurn, dice, `rolled ${dice}, no moves`, state);
      const diceState: GameState = { ...state, diceValue: dice, turnPhase: "moving" };
      setGameState(diceState);
      await new Promise((r) => setTimeout(r, 400));
      setGameState(result.state);
    }

    // Prize distribution and match recording handled server-side
  };

  // ── Auto-skip (server-side) ───────────────────────────────────
  const handleAutoSkip = async () => {
    if (!gameState || !roomId) return;

    const result = await invokeGameAction("auto-skip");
    if (!result) return;

    if (result.forfeit) {
      addLog(gameState.currentTurn, 0, "auto-forfeited (5 skips)", gameState);
      toast.error("Player auto-forfeited after 5 missed turns!");
    } else {
      const dice = result.diceValue || 0;
      if (result.movedTokenIndex !== null && result.movedTokenIndex !== undefined && result.stateBeforeMove) {
        addLog(gameState.currentTurn, dice, `auto: ${describeMove(result.stateBeforeMove, result.movedTokenIndex, dice)}`, result.stateBeforeMove);
      } else {
        addLog(gameState.currentTurn, dice, `timed out, auto-rolled ${dice}, no moves`, gameState);
      }
    }

    setGameState(result.state);

    // Prize distribution and match recording handled server-side
  };

  // ── Quit game (server-side) ───────────────────────────────────
  const handleQuitGame = async () => {
    if (!roomId || !user || !gameState) return;

    const result = await invokeGameAction("quit");
    if (!result) return;

    setGameState(result.state);

    // Prize distribution and match recording handled server-side

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
