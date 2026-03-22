/**
 * SmartLudoDice — Biased dice roller for exciting Ludo gameplay.
 *
 * Combines multiple strategies:
 * 1. Comeback bias — helps lagging players catch up
 * 2. Anti-drought — prevents long streaks without a 6
 * 3. Magic needed roll — boosts dice for kills & home entry
 * 4. Dramatic utility — softmax over move excitement scores
 */

import {
  GameState,
  MAIN_PATH,
  HOME_ENTRY_POSITIONS,
  SAFE_POSITIONS,
  START_POSITIONS,
  HOME_COLUMNS,
} from "./ludoEngine";

// ── Helpers ──────────────────────────────────────

function weightedChoice(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i + 1; // dice face 1-6
  }
  return 6;
}

function normalize(probs: number[]): number[] {
  // clamp negatives
  const clamped = probs.map((p) => Math.max(p, 0.01));
  const total = clamped.reduce((a, b) => a + b, 0);
  return clamped.map((p) => p / total);
}

// ── Progress calculation ─────────────────────────

/** Returns 0-100 progress score for a player seat */
function getPlayerProgress(state: GameState, seat: number): number {
  const colorIdx = state.colorOrder?.[seat] ?? seat;
  let score = 0;
  for (const token of state.tokens[seat]) {
    if (token.position === "finished") {
      score += 57; // full journey
    } else if (token.position === "home_column") {
      score += 52 + token.pathIndex;
    } else if (token.position === "path") {
      const start = START_POSITIONS[colorIdx];
      const dist = (token.pathIndex - start + 52) % 52;
      score += dist;
    }
    // home = 0
  }
  return score;
}

// ── Find useful rolls (kills, home entry, exit) ──

function findUsefulRolls(state: GameState, seat: number): Set<number> {
  const colorIdx = state.colorOrder?.[seat] ?? seat;
  const useful = new Set<number>();

  for (let dice = 1; dice <= 6; dice++) {
    for (let t = 0; t < 4; t++) {
      const token = state.tokens[seat][t];

      // 6 to exit home
      if (token.position === "home" && dice === 6) {
        useful.add(6);
        continue;
      }

      if (token.position === "path") {
        const homeEntry = HOME_ENTRY_POSITIONS[colorIdx];
        const distToHome = (homeEntry - token.pathIndex + 52) % 52;

        // Check home entry
        if (distToHome > 0 && distToHome <= dice) {
          useful.add(dice);
          continue;
        }
        if (distToHome === 0 && dice <= 6) {
          useful.add(dice);
          continue;
        }

        // Check kill
        const newIdx = (token.pathIndex + dice) % 52;
        if (!SAFE_POSITIONS.has(newIdx)) {
          for (let p = 0; p < state.playerCount; p++) {
            if (p === seat) continue;
            for (const oToken of state.tokens[p]) {
              if (oToken.position === "path" && oToken.pathIndex === newIdx) {
                useful.add(dice);
              }
            }
          }
        }
      }

      // Home column finish
      if (token.position === "home_column") {
        const newIdx = token.pathIndex + dice;
        if (newIdx === 5) {
          useful.add(dice);
        }
      }
    }
  }

  return useful;
}

// ── Streak tracking ──────────────────────────────

const nonSixStreak: Record<number, number> = {};
const consecutiveSixes: Record<number, number> = {};

function resetStreak(seat: number) {
  nonSixStreak[seat] = 0;
}

// ── Strategies ───────────────────────────────────

function comebackBias(state: GameState, seat: number): number[] {
  const myProgress = getPlayerProgress(state, seat);
  let maxOther = 0;
  let minOther = Infinity;
  for (let p = 0; p < state.playerCount; p++) {
    if (p === seat) continue;
    const prog = getPlayerProgress(state, p);
    maxOther = Math.max(maxOther, prog);
    minOther = Math.min(minOther, prog);
  }

  const behindScore = maxOther - myProgress; // positive = behind
  const probs = [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];

  if (behindScore > 30) {
    // very behind
    probs[4] += 0.10; // more 5s
    probs[5] += 0.15; // more 6s
  } else if (behindScore > 15) {
    probs[4] += 0.05;
    probs[5] += 0.08;
  } else if (behindScore < -30) {
    // dominating — nerf slightly
    probs[5] -= 0.08;
    probs[0] += 0.04;
    probs[1] += 0.03;
  }

  return normalize(probs);
}

function antiDroughtBias(seat: number): number[] {
  const streak = nonSixStreak[seat] || 0;
  const pSix = Math.min(1 / 6 + streak * 0.045, 0.50);
  const pOther = (1 - pSix) / 5;
  return [pOther, pOther, pOther, pOther, pOther, pSix];
}

function magicNeededBias(state: GameState, seat: number): number[] {
  const useful = findUsefulRolls(state, seat);

  if (useful.size === 1) {
    const magic = useful.values().next().value!;
    const probs = [0.08, 0.08, 0.08, 0.08, 0.08, 0.08];
    probs[magic - 1] = 0.45; // 45% chance for the perfect roll
    return normalize(probs);
  }

  if (useful.size > 1) {
    const probs = Array.from({ length: 6 }, (_, i) =>
      useful.has(i + 1) ? 0.20 : 0.10
    );
    return normalize(probs);
  }

  return [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
}

function dramaticUtility(state: GameState, seat: number): number[] {
  const useful = findUsefulRolls(state, seat);
  const utilities = Array.from({ length: 6 }, (_, i) => {
    const roll = i + 1;
    let u = roll * 1.0;
    if (roll === 6) u += 8;
    if (useful.has(roll)) u += 15;
    return u;
  });

  // Softmax with temperature
  const temperature = 3.0;
  const expU = utilities.map((u) => Math.exp(u / temperature));
  const total = expU.reduce((a, b) => a + b, 0);
  return expU.map((e) => e / total);
}

// ── Main smart roll function ─────────────────────

/**
 * Roll the dice with combined biased probability.
 * Blends comeback, anti-drought, magic-needed, and dramatic utility.
 */
export function smartRollDice(state: GameState, seat: number): number {
  // Get weights from each strategy
  const comeback = comebackBias(state, seat);
  const drought = antiDroughtBias(seat);
  const magic = magicNeededBias(state, seat);
  const dramatic = dramaticUtility(state, seat);

  // Blend strategies with weights
  const blendWeights = {
    comeback: 0.25,
    drought: 0.25,
    magic: 0.30,
    dramatic: 0.20,
  };

  const blended = Array.from({ length: 6 }, (_, i) =>
    comeback[i] * blendWeights.comeback +
    drought[i] * blendWeights.drought +
    magic[i] * blendWeights.magic +
    dramatic[i] * blendWeights.dramatic
  );

  // If player already rolled two consecutive 6s, force no 6
  const prevSixes = consecutiveSixes[seat] || 0;
  if (prevSixes >= 2) {
    // Zero out the 6 probability
    blended[5] = 0;
  }

  const finalProbs = normalize(blended);
  const result = weightedChoice(finalProbs);

  // Update consecutive sixes tracker
  if (result === 6) {
    consecutiveSixes[seat] = (consecutiveSixes[seat] || 0) + 1;
    resetStreak(seat);
  } else {
    consecutiveSixes[seat] = 0;
    nonSixStreak[seat] = (nonSixStreak[seat] || 0) + 1;
  }

  return result;
}

/** Reset all streaks (call on new game) */
export function resetAllStreaks() {
  for (const key of Object.keys(nonSixStreak)) {
    delete nonSixStreak[Number(key)];
  }
  for (const key of Object.keys(consecutiveSixes)) {
    delete consecutiveSixes[Number(key)];
  }
}
