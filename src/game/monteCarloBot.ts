/**
 * Monte Carlo Tree Search bot for Ludo.
 * Runs 200 random simulations per candidate move and picks the one
 * with the highest win-rate for the current player.
 */

import {
  GameState,
  TokenState,
  getMovableTokens,
  moveToken,
  rollDice,
} from "./ludoEngine";

const SIMULATIONS = 200;
const MAX_SIM_TURNS = 200; // cap per simulation to avoid runaway games

/** Deep clone a GameState (much faster than JSON round-trip for small objects) */
function cloneState(s: GameState): GameState {
  return {
    tokens: s.tokens.map((pt) => pt.map((t) => ({ ...t }))),
    colorOrder: [...s.colorOrder],
    currentTurn: s.currentTurn,
    diceValue: s.diceValue,
    turnPhase: s.turnPhase,
    consecutiveSixes: s.consecutiveSixes,
    winner: s.winner,
    playerCount: s.playerCount,
    skipCounts: s.skipCounts ? [...s.skipCounts] : undefined,
  };
}

/** Score a state for a given player seat (higher = better). */
function scoreState(state: GameState, seat: number): number {
  if (state.winner === seat) return 1;
  if (state.winner !== null) return 0;

  // Heuristic: fraction of progress (0–1)
  let progress = 0;
  for (const token of state.tokens[seat]) {
    if (token.position === "finished") {
      progress += 1;
    } else if (token.position === "home_column") {
      progress += 0.7 + (token.pathIndex / 5) * 0.3;
    } else if (token.position === "path") {
      progress += 0.1 + 0.6 * (token.pathIndex / 51);
    }
    // home = 0
  }
  return progress / 4; // normalise to 0–1
}

/** Simulate a random playout from a state and return the score for `seat`. */
function simulateRandom(state: GameState, seat: number): number {
  const sim = cloneState(state);

  for (let turn = 0; turn < MAX_SIM_TURNS; turn++) {
    if (sim.winner !== null) break;

    // Roll
    const dice = rollDice();
    sim.diceValue = dice;
    sim.turnPhase = "moving";

    const movable = getMovableTokens(sim);

    if (movable.length === 0) {
      // No moves — pass
      sim.currentTurn = (sim.currentTurn + 1) % sim.playerCount;
      sim.turnPhase = "rolling";
      sim.diceValue = null;
      sim.consecutiveSixes = 0;
      continue;
    }

    // Pick random move
    const chosen = movable[Math.floor(Math.random() * movable.length)];
    const next = moveToken(sim, chosen);

    // Copy result back into sim
    sim.tokens = next.tokens;
    sim.currentTurn = next.currentTurn;
    sim.diceValue = next.diceValue;
    sim.turnPhase = next.turnPhase;
    sim.consecutiveSixes = next.consecutiveSixes;
    sim.winner = next.winner;
  }

  return scoreState(sim, seat);
}

/**
 * Given a game state where it's `botSeat`'s turn and `diceValue` is already set,
 * run Monte Carlo simulations for each movable token and return the best token index.
 * Falls back to random if no moves or simulations aren't useful.
 */
export function pickBestMove(state: GameState, botSeat: number): number {
  const movable = getMovableTokens(state);
  if (movable.length <= 1) return movable[0] ?? 0;

  // Quick heuristics that don't need simulation:
  // 1. If we can kill an opponent, strongly prefer it
  // 2. If we can finish a token, do it
  const quickScores = movable.map((ti) => {
    const after = moveToken(cloneState(state), ti);
    if (after.winner === botSeat) return Infinity; // instant win
    // Check if token finished
    if (after.tokens[botSeat][ti].position === "finished" &&
        state.tokens[botSeat][ti].position !== "finished") {
      return 10000;
    }
    // Check for kill (any opponent token sent home)
    let killBonus = 0;
    for (let p = 0; p < state.playerCount; p++) {
      if (p === botSeat) continue;
      for (let t = 0; t < 4; t++) {
        if (state.tokens[p][t].position === "path" &&
            after.tokens[p][t].position === "home") {
          killBonus += 5000;
        }
      }
    }
    return killBonus;
  });

  // If any quick heuristic is decisive, use it
  const maxQuick = Math.max(...quickScores);
  if (maxQuick >= 5000) {
    return movable[quickScores.indexOf(maxQuick)];
  }

  // Monte Carlo simulation
  const simsPerMove = Math.floor(SIMULATIONS / movable.length);
  const scores = movable.map((tokenIndex) => {
    // Apply the move
    const afterMove = moveToken(cloneState(state), tokenIndex);

    let totalScore = 0;
    for (let s = 0; s < simsPerMove; s++) {
      totalScore += simulateRandom(afterMove, botSeat);
    }
    return totalScore / simsPerMove;
  });

  // Pick the move with highest average score
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] > bestScore) {
      bestScore = scores[i];
      bestIdx = i;
    }
  }

  return movable[bestIdx];
}
