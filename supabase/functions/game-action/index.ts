import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Game Constants ────────────────────────────────────────────────
const START_POSITIONS = [13, 26, 39, 0];
const SAFE_POSITIONS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const HOME_ENTRY_POSITIONS = [11, 24, 37, 50];

// ── Types ─────────────────────────────────────────────────────────
interface TokenState {
  position: "home" | "path" | "home_column" | "finished";
  pathIndex: number;
}

interface GameState {
  tokens: TokenState[][];
  colorOrder: number[];
  currentTurn: number;
  diceValue: number | null;
  turnPhase: string;
  consecutiveSixes: number;
  winner: number | null;
  playerCount: number;
  skipCounts?: number[];
}

// ── Dice ──────────────────────────────────────────────────────────
function serverRollDice(state: GameState): number {
  if (state.consecutiveSixes >= 2) {
    return Math.floor(Math.random() * 5) + 1;
  }
  return Math.floor(Math.random() * 6) + 1;
}

// ── Game Logic ────────────────────────────────────────────────────
function getColorIndex(state: GameState, seat: number): number {
  return state.colorOrder?.[seat] ?? seat;
}

function getMovableTokens(state: GameState): number[] {
  const { tokens, currentTurn, diceValue } = state;
  if (diceValue === null) return [];

  const playerTokens = tokens[currentTurn];
  const movable: number[] = [];
  const colorIdx = getColorIndex(state, currentTurn);

  for (let i = 0; i < 4; i++) {
    const token = playerTokens[i];
    if (token.position === "finished") continue;

    if (token.position === "home") {
      if (diceValue === 6) movable.push(i);
      continue;
    }

    if (token.position === "path") {
      const homeEntry = HOME_ENTRY_POSITIONS[colorIdx];
      const distToHome = ((homeEntry - token.pathIndex + 52) % 52);
      if (distToHome > 0 && distToHome <= diceValue) {
        const remaining = diceValue - distToHome;
        if (remaining <= 6) movable.push(i);
      } else if (distToHome === 0 && diceValue <= 6) {
        movable.push(i);
      } else {
        movable.push(i);
      }
      continue;
    }

    if (token.position === "home_column") {
      if (token.pathIndex + diceValue <= 5) movable.push(i);
      continue;
    }
  }

  return movable;
}

function checkAndKill(state: GameState, currentPlayer: number, pathIndex: number): boolean {
  if (SAFE_POSITIONS.has(pathIndex)) return false;
  let killed = false;
  for (let p = 0; p < state.playerCount; p++) {
    if (p === currentPlayer) continue;
    for (let t = 0; t < 4; t++) {
      if (state.tokens[p][t].position === "path" && state.tokens[p][t].pathIndex === pathIndex) {
        state.tokens[p][t] = { position: "home", pathIndex: 0 };
        killed = true;
      }
    }
  }
  return killed;
}

function moveToken(state: GameState, tokenIndex: number): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const { currentTurn, diceValue, playerCount } = newState;
  if (diceValue === null) return newState;

  const token = newState.tokens[currentTurn][tokenIndex];
  const colorIdx = getColorIndex(newState, currentTurn);
  let gotKill = false;
  let gotHome = false;

  if (token.position === "home" && diceValue === 6) {
    token.position = "path";
    token.pathIndex = START_POSITIONS[colorIdx];
    gotKill = checkAndKill(newState, currentTurn, token.pathIndex);
  } else if (token.position === "path") {
    const homeEntry = HOME_ENTRY_POSITIONS[colorIdx];
    const distToHome = ((homeEntry - token.pathIndex + 52) % 52);

    if (distToHome > 0 && distToHome < diceValue) {
      const remaining = diceValue - distToHome;
      token.position = "home_column";
      token.pathIndex = remaining - 1;
      if (token.pathIndex === 5) { token.position = "finished"; gotHome = true; }
    } else if (distToHome > 0 && distToHome === diceValue) {
      token.pathIndex = homeEntry;
      gotKill = checkAndKill(newState, currentTurn, token.pathIndex);
    } else if (distToHome === 0) {
      token.position = "home_column";
      token.pathIndex = diceValue - 1;
      if (token.pathIndex === 5) { token.position = "finished"; gotHome = true; }
    } else {
      token.pathIndex = (token.pathIndex + diceValue) % 52;
      gotKill = checkAndKill(newState, currentTurn, token.pathIndex);
    }
  } else if (token.position === "home_column") {
    token.pathIndex += diceValue;
    if (token.pathIndex >= 5) { token.position = "finished"; token.pathIndex = 5; gotHome = true; }
  }

  // Check winner
  if (newState.tokens[currentTurn].every((t) => t.position === "finished")) {
    newState.winner = currentTurn;
    newState.turnPhase = "finished";
    return newState;
  }

  // Next turn logic
  if (diceValue === 6 && newState.consecutiveSixes < 2) {
    newState.consecutiveSixes += 1;
    newState.turnPhase = "rolling";
    newState.diceValue = null;
  } else if (gotKill || gotHome) {
    newState.consecutiveSixes = 0;
    newState.turnPhase = "rolling";
    newState.diceValue = null;
  } else {
    newState.consecutiveSixes = 0;
    newState.currentTurn = (currentTurn + 1) % playerCount;
    newState.turnPhase = "rolling";
    newState.diceValue = null;
  }

  return newState;
}

function pickBotMove(state: GameState, seat: number): number {
  const movable = getMovableTokens(state);
  if (movable.length <= 1) return movable[0] ?? 0;

  for (const ti of movable) {
    const after = moveToken(JSON.parse(JSON.stringify(state)), ti);
    if (after.winner === seat) return ti;
  }
  for (const ti of movable) {
    const after = moveToken(JSON.parse(JSON.stringify(state)), ti);
    if (after.tokens[seat][ti].position === "finished" && state.tokens[seat][ti].position !== "finished") return ti;
  }
  for (const ti of movable) {
    const after = moveToken(JSON.parse(JSON.stringify(state)), ti);
    for (let p = 0; p < state.playerCount; p++) {
      if (p === seat) continue;
      for (let t = 0; t < 4; t++) {
        if (state.tokens[p][t].position === "path" && after.tokens[p][t].position === "home") return ti;
      }
    }
  }
  for (const ti of movable) {
    if (state.tokens[seat][ti].position === "home") return ti;
  }
  return movable[0];
}

// ── DB helpers ────────────────────────────────────────────────────
async function saveState(supabase: ReturnType<typeof createClient>, roomId: string, state: GameState) {
  await supabase
    .from("game_states")
    .update({
      current_turn: state.currentTurn,
      turn_phase: state.turnPhase,
      dice_value: state.diceValue,
      token_positions: state as unknown as Record<string, unknown>,
      turn_start_at: new Date().toISOString(),
    })
    .eq("room_id", roomId);

  if (state.turnPhase === "finished" || state.winner !== null) {
    await supabase.from("game_rooms").update({ status: "finished" }).eq("id", roomId);
  }
}

// ── Prize distribution ───────────────────────────────────────────
async function distributePrize(
  supabase: ReturnType<typeof createClient>,
  roomId: string,
  winnerSeat: number,
  players: Array<{ user_id: string; is_bot?: boolean }>,
  state: GameState,
  finishReason: string
) {
  const winnerPlayer = players[winnerSeat];
  if (!winnerPlayer) return;

  // Get room bet amount
  const { data: room } = await supabase
    .from("game_rooms")
    .select("bet_amount, code, created_at")
    .eq("id", roomId)
    .single();

  if (!room) return;

  const pot = room.bet_amount * players.length;

  // Update game_rooms winner
  await supabase.from("game_rooms").update({ winner_id: winnerPlayer.user_id }).eq("id", roomId);

  // Credit winner wallet (only if not a bot)
  const isWinnerBot = winnerPlayer.is_bot ?? false;
  if (!isWinnerBot) {
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", winnerPlayer.user_id)
      .single();

    if (wallet) {
      await supabase
        .from("wallets")
        .update({ balance: wallet.balance + pot })
        .eq("user_id", winnerPlayer.user_id);

      await supabase.from("transactions").insert({
        user_id: winnerPlayer.user_id,
        type: "credit",
        amount: pot,
        description: `Won game #${room.code} (pot: ${pot})`,
      });
    }
  }

  // Record match
  const finishedAt = new Date().toISOString();
  const startedAt = room.created_at;
  const durationSeconds = Math.floor(
    (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000
  );

  await supabase.from("match_records").insert({
    room_id: roomId,
    room_code: room.code,
    bet_amount: room.bet_amount,
    player_count: state.playerCount,
    players: players as unknown as Record<string, unknown>,
    winner_seat: winnerSeat,
    winner_user_id: winnerPlayer.user_id,
    final_state: state as unknown as Record<string, unknown>,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_seconds: durationSeconds,
    finish_reason: finishReason,
  });
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

// ── Main Handler ──────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401);
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return errorResponse("Unauthorized", 401);
    }
    const userId = claimsData.claims.sub as string;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, roomId, tokenIndex } = body;

    if (!roomId) return errorResponse("roomId required");

    // Load game state
    const { data: gameStateRow } = await supabaseAdmin
      .from("game_states")
      .select("*")
      .eq("room_id", roomId)
      .single();

    if (!gameStateRow) return errorResponse("Game not found", 404);

    const state = (gameStateRow as Record<string, unknown>).token_positions as unknown as GameState;
    if (state.winner !== null || state.turnPhase === "finished") {
      return errorResponse("Game already finished");
    }

    // Load players (with is_bot flag)
    const { data: players } = await supabaseAdmin
      .from("room_players")
      .select("user_id, color_index, is_bot")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    if (!players) return errorResponse("Room not found", 404);

    const callerSeatIdx = players.findIndex((p: { user_id: string }) => p.user_id === userId);
    if (callerSeatIdx < 0) return errorResponse("Not a player in this room", 403);

    const currentPlayer = players[state.currentTurn];
    const currentIsBot = currentPlayer?.is_bot === true;

    // Helper to handle finished game
    const handleFinish = async (finalState: GameState, reason: string) => {
      if (finalState.winner !== null) {
        await distributePrize(supabaseAdmin, roomId, finalState.winner, players, finalState, reason);
      }
    };

    switch (action) {
      case "roll": {
        if (state.currentTurn !== callerSeatIdx) {
          return errorResponse("Not your turn");
        }
        if (state.turnPhase !== "rolling") {
          return errorResponse("Not rolling phase");
        }

        const dice = serverRollDice(state);
        const skipCounts = [...(state.skipCounts || Array(state.playerCount).fill(0))];
        skipCounts[callerSeatIdx] = 0;

        const diceState: GameState = { ...state, diceValue: dice, turnPhase: "moving", skipCounts };
        const movable = getMovableTokens(diceState);

        if (movable.length === 0) {
          const nextState: GameState = {
            ...diceState,
            currentTurn: (diceState.currentTurn + 1) % diceState.playerCount,
            turnPhase: "rolling",
            diceValue: null,
            consecutiveSixes: 0,
          };
          await saveState(supabaseAdmin, roomId, nextState);
          return jsonResponse({ diceValue: dice, movableTokens: [], autoMoved: false, state: nextState });
        }

        if (movable.length === 1) {
          const stateBeforeMove = JSON.parse(JSON.stringify(diceState));
          const finalState = moveToken(diceState, movable[0]);
          finalState.skipCounts = skipCounts;
          await saveState(supabaseAdmin, roomId, finalState);
          await handleFinish(finalState, "normal");
          return jsonResponse({
            diceValue: dice,
            movableTokens: movable,
            autoMoved: true,
            movedTokenIndex: movable[0],
            stateBeforeMove,
            state: finalState,
          });
        }

        await saveState(supabaseAdmin, roomId, diceState);
        return jsonResponse({
          diceValue: dice,
          movableTokens: movable,
          autoMoved: false,
          state: diceState,
        });
      }

      case "move": {
        if (state.currentTurn !== callerSeatIdx) {
          return errorResponse("Not your turn");
        }
        if (state.turnPhase !== "moving") {
          return errorResponse("Not moving phase");
        }
        if (typeof tokenIndex !== "number" || tokenIndex < 0 || tokenIndex > 3) {
          return errorResponse("Invalid token index");
        }

        const movable = getMovableTokens(state);
        if (!movable.includes(tokenIndex)) {
          return errorResponse("Token cannot move");
        }

        const stateBeforeMove = JSON.parse(JSON.stringify(state));
        const finalState = moveToken(state, tokenIndex);
        await saveState(supabaseAdmin, roomId, finalState);
        await handleFinish(finalState, "normal");
        return jsonResponse({
          movedTokenIndex: tokenIndex,
          stateBeforeMove,
          state: finalState,
        });
      }

      case "bot-turn": {
        if (!currentIsBot) {
          return errorResponse("Current player is not a bot");
        }
        if (state.turnPhase !== "rolling") {
          return errorResponse("Not rolling phase");
        }

        const dice = serverRollDice(state);
        const diceState: GameState = { ...state, diceValue: dice, turnPhase: "moving" };
        const movable = getMovableTokens(diceState);

        if (movable.length === 0) {
          const nextState: GameState = {
            ...diceState,
            currentTurn: (diceState.currentTurn + 1) % diceState.playerCount,
            turnPhase: "rolling",
            diceValue: null,
            consecutiveSixes: 0,
          };
          await saveState(supabaseAdmin, roomId, nextState);
          return jsonResponse({ diceValue: dice, movableTokens: [], movedTokenIndex: null, state: nextState });
        }

        const chosen = pickBotMove(diceState, state.currentTurn);
        const stateBeforeMove = JSON.parse(JSON.stringify(diceState));
        const finalState = moveToken(diceState, chosen);
        await saveState(supabaseAdmin, roomId, finalState);
        await handleFinish(finalState, "normal");
        return jsonResponse({
          diceValue: dice,
          movableTokens: movable,
          movedTokenIndex: chosen,
          stateBeforeMove,
          state: finalState,
        });
      }

      case "auto-skip": {
        const MAX_SKIPS = 5;
        const skipCounts = [...(state.skipCounts || Array(state.playerCount).fill(0))];
        skipCounts[state.currentTurn] = (skipCounts[state.currentTurn] || 0) + 1;

        if (skipCounts[state.currentTurn] >= MAX_SKIPS) {
          const winnerSeat = (state.currentTurn + 1) % state.playerCount;
          const forfeitState: GameState = {
            ...state,
            turnPhase: "finished",
            winner: winnerSeat,
            diceValue: null,
            skipCounts,
          };
          await saveState(supabaseAdmin, roomId, forfeitState);
          await handleFinish(forfeitState, "forfeit");
          return jsonResponse({ forfeit: true, diceValue: 0, movedTokenIndex: null, state: forfeitState });
        }

        // Auto-skip: just pass turn, no auto-move
        const nextState: GameState = {
          ...state,
          currentTurn: (state.currentTurn + 1) % state.playerCount,
          turnPhase: "rolling",
          diceValue: null,
          consecutiveSixes: 0,
          skipCounts,
        };
        await saveState(supabaseAdmin, roomId, nextState);
        return jsonResponse({ forfeit: false, diceValue: 0, movedTokenIndex: null, state: nextState });
      }

      case "quit": {
        if (callerSeatIdx < 0) return errorResponse("Not a player");

        const winnerSeat = (callerSeatIdx + 1) % state.playerCount;
        const forfeitState: GameState = {
          ...state,
          turnPhase: "finished",
          winner: winnerSeat,
          diceValue: null,
        };
        await saveState(supabaseAdmin, roomId, forfeitState);
        await handleFinish(forfeitState, "quit");

        await supabaseAdmin
          .from("room_players")
          .delete()
          .eq("room_id", roomId)
          .eq("user_id", userId);

        return jsonResponse({ state: forfeitState });
      }

      default:
        return errorResponse("Unknown action");
    }
  } catch (e) {
    console.error("game-action error:", e);
    return errorResponse("Internal server error", 500);
  }
});
