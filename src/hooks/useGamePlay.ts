import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  GameState,
  createInitialGameState,
  rollDice,
  getMovableTokens,
  moveToken,
} from "@/game/ludoEngine";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

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

    if (players) {
      const userIds = players.map((p) => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, phone")
        .in("user_id", userIds);

      const names = players.map((p) => {
        const profile = profiles?.find((pr) => pr.user_id === p.user_id);
        if (profile) return profile.display_name || profile.phone.slice(-4);
        return "Bot";
      });
      setPlayerNames(names);

      const myIndex = players.findIndex((p) => p.user_id === user?.id);
      if (myIndex >= 0) {
        setPlayerIndex(myIndex);
        setIsSpectator(false);
      } else {
        setIsSpectator(true);
        setPlayerIndex(null);
      }
    }

    const { data: existingState } = await supabase
      .from("game_states")
      .select("*")
      .eq("room_id", roomId)
      .single();

    if (existingState) {
      const parsed = existingState.token_positions as unknown as GameState;
      setGameState(parsed);
    } else if (room && user && room.created_by === user.id) {
      const playerCount = players?.length || 2;
      const initial = createInitialGameState(playerCount);

      const { error } = await supabase.from("game_states").insert([{
        room_id: roomId,
        current_turn: 0,
        turn_phase: "rolling",
        token_positions: initial as unknown as Json,
        turn_start_at: new Date().toISOString(),
      }]);

      if (error) {
        console.error("Failed to create game state:", error);
      } else {
        setGameState(initial);
      }
    }
  }, [roomId, user]);

  useEffect(() => {
    loadGameState();
  }, [loadGameState]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`game-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_states",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newState = payload.new;
          if (newState.token_positions) {
            setGameState(newState.token_positions as unknown as GameState);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    if (!gameState || gameState.turnPhase === "finished") return;

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

    const newState: GameState = {
      ...gameState,
      currentTurn: (gameState.currentTurn + 1) % gameState.playerCount,
      turnPhase: "rolling",
      diceValue: null,
      consecutiveSixes: 0,
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
  };

  const handleRollDice = async () => {
    if (!gameState || playerIndex === null || isSpectator) return;
    if (gameState.currentTurn !== playerIndex) return;
    if (gameState.turnPhase !== "rolling") return;

    setRolling(true);
    await new Promise((r) => setTimeout(r, 600));

    const dice = rollDice();
    let newState: GameState = { ...gameState, diceValue: dice, turnPhase: "moving" };

    const movable = getMovableTokens(newState);
    if (movable.length === 0) {
      newState = {
        ...newState,
        currentTurn: (newState.currentTurn + 1) % newState.playerCount,
        turnPhase: "rolling",
        diceValue: null,
        consecutiveSixes: 0,
      };
    } else if (movable.length === 1) {
      newState = moveToken(newState, movable[0]);
    }

    await saveGameState(newState);
    setRolling(false);

    if (newState.turnPhase === "rolling" && newState.winner === null) {
      scheduleBotTurn(newState);
    }
  };

  const handleTokenClick = async (tokenIndex: number) => {
    if (!gameState || playerIndex === null || isSpectator) return;
    if (gameState.currentTurn !== playerIndex) return;
    if (gameState.turnPhase !== "moving") return;

    const movable = getMovableTokens(gameState);
    if (!movable.includes(tokenIndex)) return;

    const newState = moveToken(gameState, tokenIndex);
    await saveGameState(newState);

    if (newState.turnPhase === "rolling" && newState.winner === null) {
      scheduleBotTurn(newState);
    }
  };

  const scheduleBotTurn = (state: GameState) => {
    const currentName = playerNames[state.currentTurn];
    if (currentName === "Bot") {
      setTimeout(() => playBotTurn(state), 1000);
    }
  };

  const playBotTurn = async (state: GameState) => {
    const dice = rollDice();
    let newState: GameState = { ...state, diceValue: dice, turnPhase: "moving" };

    const movable = getMovableTokens(newState);
    if (movable.length === 0) {
      newState = {
        ...newState,
        currentTurn: (newState.currentTurn + 1) % newState.playerCount,
        turnPhase: "rolling",
        diceValue: null,
        consecutiveSixes: 0,
      };
    } else {
      const chosen = movable[Math.floor(Math.random() * movable.length)];
      newState = moveToken(newState, chosen);
    }

    await saveGameState(newState);

    if (newState.turnPhase === "rolling" && newState.winner === null) {
      const nextName = playerNames[newState.currentTurn];
      if (nextName === "Bot") {
        setTimeout(() => playBotTurn(newState), 1000);
      }
    }
  };

  const handleQuitGame = async () => {
    if (!roomId || !user) return;
    // Remove player from room
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
    handleRollDice,
    handleTokenClick,
    handleQuitGame,
  };
}
