// Ludo board constants and path definitions

// Player colors
export const PLAYER_COLORS = ["#F56565", "#68D391", "#F6E05E", "#63B3ED"] as const;
export const PLAYER_NAMES = ["Red", "Green", "Yellow", "Blue"] as const;
export const PLAYER_BG = ["#FFF5F5", "#F0FFF4", "#FFFFF0", "#EBF8FF"] as const;

// Lighter versions of player colors for home tiles and arrows
export const PLAYER_COLORS_LIGHT = ["#FC8181", "#9AE6B4", "#FAF089", "#90CDF4"] as const;

// Standard Ludo: Red(TL) vs Yellow(BR), Green(TR) vs Blue(BL)
// Player seating order: 0=Red(TL), 1=Green(TR), 2=Yellow(BR), 3=Blue(BL)

// Board is 15x15 grid
export const BOARD_SIZE = 15;

// Starting positions for tokens in home base (relative to home base corner)
export const HOME_TOKEN_POSITIONS = [
  { row: 1.5, col: 1.5 },  // between 1,1 and 1,2
  { row: 1.5, col: 3.5 },  // between 1,3 and 1,4
  { row: 3.5, col: 1.5 },  // between 3,1 and 3,2
  { row: 3.5, col: 3.5 },  // between 3,3 and 3,4
];

// Home base top-left corners for each player (Red, Green, Yellow, Blue)
export const HOME_BASE_ORIGINS = [
  { row: 0, col: 0 },   // Red - top-left
  { row: 0, col: 9 },   // Green - top-right
  { row: 9, col: 9 },   // Yellow - bottom-right
  { row: 9, col: 0 },   // Blue - bottom-left
];

// Starting cell index on the main path for each player
export const START_POSITIONS = [13, 26, 39, 0];

// Safe zone positions on the main path (0-indexed)
export const SAFE_POSITIONS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Main path coordinates (52 cells going clockwise)
// Standard Ludo: Red(TL) starts at (6,1), Green(TR) at (1,8), Yellow(BR) at (8,13), Blue(BL) at (13,6)
export const MAIN_PATH: { row: number; col: number }[] = [
  // Blue start — bottom arm, col 6, going up (cells 0-4)
  { row: 13, col: 6 }, // 0 — Blue start/safe
  { row: 12, col: 6 }, // 1
  { row: 11, col: 6 }, // 2
  { row: 10, col: 6 }, // 3
  { row: 9, col: 6 },  // 4
  // Left arm, row 8, going left (cells 5-10)
  { row: 8, col: 5 },  // 5
  { row: 8, col: 4 },  // 6
  { row: 8, col: 3 },  // 7
  { row: 8, col: 2 },  // 8 — safe
  { row: 8, col: 1 },  // 9
  { row: 8, col: 0 },  // 10
  // Left connecting cells (cells 11-12)
  { row: 7, col: 0 },  // 11
  { row: 6, col: 0 },  // 12
  // Red start — left arm, row 6, going right (cells 13-17)
  { row: 6, col: 1 },  // 13 — Red start/safe
  { row: 6, col: 2 },  // 14
  { row: 6, col: 3 },  // 15
  { row: 6, col: 4 },  // 16
  { row: 6, col: 5 },  // 17
  // Top arm, col 6, going up (cells 18-23)
  { row: 5, col: 6 },  // 18
  { row: 4, col: 6 },  // 19
  { row: 3, col: 6 },  // 20
  { row: 2, col: 6 },  // 21 — safe
  { row: 1, col: 6 },  // 22
  { row: 0, col: 6 },  // 23
  // Top connecting cells (cells 24-25)
  { row: 0, col: 7 },  // 24
  { row: 0, col: 8 },  // 25
  // Green start — top arm, col 8, going down (cells 26-30)
  { row: 1, col: 8 },  // 26 — Green start/safe
  { row: 2, col: 8 },  // 27
  { row: 3, col: 8 },  // 28
  { row: 4, col: 8 },  // 29
  { row: 5, col: 8 },  // 30
  // Right arm, row 6, going right (cells 31-36)
  { row: 6, col: 9 },  // 31
  { row: 6, col: 10 }, // 32
  { row: 6, col: 11 }, // 33
  { row: 6, col: 12 }, // 34 — safe
  { row: 6, col: 13 }, // 35
  { row: 6, col: 14 }, // 36
  // Right connecting cells (cells 37-38)
  { row: 7, col: 14 }, // 37
  { row: 8, col: 14 }, // 38
  // Yellow start — right arm, row 8, going left (cells 39-43)
  { row: 8, col: 13 }, // 39 — Yellow start/safe
  { row: 8, col: 12 }, // 40
  { row: 8, col: 11 }, // 41
  { row: 8, col: 10 }, // 42
  { row: 8, col: 9 },  // 43
  // Bottom arm, col 8, going down (cells 44-49)
  { row: 9, col: 8 },  // 44
  { row: 10, col: 8 }, // 45
  { row: 11, col: 8 }, // 46
  { row: 12, col: 8 }, // 47 — safe
  { row: 13, col: 8 }, // 48
  { row: 14, col: 8 }, // 49
  // Bottom connecting cells (cells 50-51)
  { row: 14, col: 7 }, // 50
  { row: 14, col: 6 }, // 51
  // Wraps back to cell 0: (13, 6)
];

// Home column paths (6 cells each leading to center)
export const HOME_COLUMNS: { row: number; col: number }[][] = [
  // Red (TL): enters from (6,0)→(7,0), goes right along row 7
  [{ row: 7, col: 1 }, { row: 7, col: 2 }, { row: 7, col: 3 }, { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 }],
  // Green (TR): enters from (0,8)→(0,7), goes down along col 7
  [{ row: 1, col: 7 }, { row: 2, col: 7 }, { row: 3, col: 7 }, { row: 4, col: 7 }, { row: 5, col: 7 }, { row: 6, col: 7 }],
  // Yellow (BR): enters from (8,14)→(7,14), goes left along row 7
  [{ row: 7, col: 13 }, { row: 7, col: 12 }, { row: 7, col: 11 }, { row: 7, col: 10 }, { row: 7, col: 9 }, { row: 7, col: 8 }],
  // Blue (BL): enters from (14,6)→(14,7), goes up along col 7
  [{ row: 13, col: 7 }, { row: 12, col: 7 }, { row: 11, col: 7 }, { row: 10, col: 7 }, { row: 9, col: 7 }, { row: 8, col: 7 }],
];

// Entry to home column: the main path index just before entering home column
export const HOME_ENTRY_POSITIONS = [11, 24, 37, 50];

export interface TokenState {
  position: "home" | "path" | "home_column" | "finished";
  pathIndex: number; // index on MAIN_PATH or HOME_COLUMNS
}

export interface GameState {
  tokens: TokenState[][]; // [playerSeat][tokenIndex]
  colorOrder: number[]; // [playerSeat] -> color index (0=Red,1=Green,2=Yellow,3=Blue)
  currentTurn: number; // player seat index
  diceValue: number | null;
  turnPhase: "rolling" | "moving" | "finished";
  consecutiveSixes: number;
  winner: number | null;
  playerCount: number;
  skipCounts?: number[]; // [playerSeat] -> consecutive skip count
  lastDiceValue?: number | null; // last dice rolled (persists for opponent display)
  lastDicePlayer?: number | null; // seat index of who rolled last
}

export function createInitialGameState(playerCount: number, colorOrder?: number[]): GameState {
  const tokens: TokenState[][] = [];
  for (let p = 0; p < playerCount; p++) {
    tokens.push([
      { position: "home", pathIndex: 0 },
      { position: "home", pathIndex: 0 },
      { position: "home", pathIndex: 0 },
      { position: "home", pathIndex: 0 },
    ]);
  }

  const resolvedColorOrder =
    colorOrder && colorOrder.length === playerCount
      ? colorOrder
      : Array.from({ length: playerCount }, (_, i) => i);

  // Blue starts whenever present; otherwise first seat starts.
  const blueSeat = resolvedColorOrder.indexOf(3);

  return {
    tokens,
    colorOrder: resolvedColorOrder,
    currentTurn: blueSeat >= 0 ? blueSeat : 0,
    diceValue: null,
    turnPhase: "rolling",
    consecutiveSixes: 0,
    winner: null,
    playerCount,
  };
}

function getPlayerColorIndex(state: GameState, playerSeat: number): number {
  return state.colorOrder?.[playerSeat] ?? playerSeat;
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function getMovableTokens(state: GameState): number[] {
  const { tokens, currentTurn, diceValue } = state;
  if (diceValue === null) return [];

  const playerTokens = tokens[currentTurn];
  const movable: number[] = [];

  for (let i = 0; i < 4; i++) {
    const token = playerTokens[i];

    if (token.position === "finished") continue;

    if (token.position === "home") {
      // Can only leave home on a 6
      if (diceValue === 6) movable.push(i);
      continue;
    }

    if (token.position === "path") {
      const newPathIndex = (token.pathIndex + diceValue) % 52;
      const playerColorIndex = getPlayerColorIndex(state, currentTurn);
      const homeEntry = HOME_ENTRY_POSITIONS[playerColorIndex];

      // Check if token should enter home column
      const distToHome = ((homeEntry - token.pathIndex + 52) % 52);
      if (distToHome > 0 && distToHome <= diceValue) {
        const remaining = diceValue - distToHome;
        if (remaining <= 6) {
          movable.push(i);
        }
      } else if (distToHome === 0 && diceValue <= 6) {
        movable.push(i);
      } else {
        movable.push(i);
      }
      continue;
    }

    if (token.position === "home_column") {
      const newIndex = token.pathIndex + diceValue;
      if (newIndex <= 5) { // 6 cells in home column (0-5), 5 is the finish
        movable.push(i);
      }
      continue;
    }
  }

  return movable;
}

// Generate intermediate states for step-by-step animation (ALL steps including each cell)
export function getIntermediateSteps(state: GameState, tokenIndex: number): GameState[] {
  const { currentTurn, diceValue } = state;
  if (diceValue === null) return [];

  const token = state.tokens[currentTurn][tokenIndex];
  const currentColorIndex = getPlayerColorIndex(state, currentTurn);
  const steps: GameState[] = [];

  if (token.position === "home") {
    // Coming out of home - no intermediate steps, just appear at start
    return [];
  }

  if (token.position === "path") {
    const homeEntry = HOME_ENTRY_POSITIONS[currentColorIndex];
    const distToHome = ((homeEntry - token.pathIndex + 52) % 52);

    // Generate a step for each cell the token passes through (excluding final destination)
    const totalSteps = diceValue - 1; // last step is handled by moveToken

    for (let s = 1; s <= totalSteps; s++) {
      const stepState = JSON.parse(JSON.stringify(state)) as GameState;
      const stepToken = stepState.tokens[currentTurn][tokenIndex];

      if (distToHome === 0) {
        // Already at home entry — move into home column
        stepToken.position = "home_column";
        stepToken.pathIndex = s - 1;
      } else if (distToHome > 0 && distToHome <= diceValue) {
        if (s < distToHome) {
          // Still on the main path, walking toward home entry
          stepToken.pathIndex = (token.pathIndex + s) % 52;
        } else if (s === distToHome) {
          // Landing on the home entry cell (stay on path visually)
          stepToken.pathIndex = homeEntry;
        } else {
          // Past home entry — now in home column
          const homeIdx = s - distToHome - 1;
          stepToken.position = "home_column";
          stepToken.pathIndex = homeIdx;
        }
      } else {
        // Normal path movement (not near home)
        stepToken.pathIndex = (token.pathIndex + s) % 52;
      }
      steps.push(stepState);
    }
  }

  if (token.position === "home_column") {
    for (let s = 1; s < diceValue; s++) {
      const stepState = JSON.parse(JSON.stringify(state)) as GameState;
      const stepToken = stepState.tokens[currentTurn][tokenIndex];
      stepToken.pathIndex = Math.min(token.pathIndex + s, 5);
      steps.push(stepState);
    }
  }

  return steps;
}

export function moveToken(state: GameState, tokenIndex: number): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const { currentTurn, diceValue, playerCount } = newState;
  if (diceValue === null) return newState;

  const token = newState.tokens[currentTurn][tokenIndex];
  const currentColorIndex = getPlayerColorIndex(newState, currentTurn);
  let gotKill = false;
  let gotHome = false;

  if (token.position === "home" && diceValue === 6) {
    // Move out of home to start position
    token.position = "path";
    token.pathIndex = START_POSITIONS[currentColorIndex];

    // Check for kills at start
    gotKill = checkAndKill(newState, currentTurn, token.pathIndex);
  } else if (token.position === "path") {
    const homeEntry = HOME_ENTRY_POSITIONS[currentColorIndex];
    const distToHome = ((homeEntry - token.pathIndex + 52) % 52);

    if (distToHome > 0 && distToHome < diceValue) {
      // Pass home entry and enter home column
      const remaining = diceValue - distToHome;
      token.position = "home_column";
      token.pathIndex = remaining - 1;
      if (token.pathIndex === 5) {
        token.position = "finished";
        gotHome = true;
      }
    } else if (distToHome > 0 && distToHome === diceValue) {
      // Land exactly on home entry — stay on path
      token.pathIndex = homeEntry;
      gotKill = checkAndKill(newState, currentTurn, token.pathIndex);
    } else if (distToHome === 0) {
      // Already at home entry
      token.position = "home_column";
      token.pathIndex = diceValue - 1;
      if (token.pathIndex === 5) {
        token.position = "finished";
        gotHome = true;
      }
    } else {
      // Normal move on path
      token.pathIndex = (token.pathIndex + diceValue) % 52;
      gotKill = checkAndKill(newState, currentTurn, token.pathIndex);
    }
  } else if (token.position === "home_column") {
    token.pathIndex += diceValue;
    if (token.pathIndex >= 5) {
      token.position = "finished";
      token.pathIndex = 5;
      gotHome = true;
    }
  }

  // Check for winner
  const allFinished = newState.tokens[currentTurn].every((t) => t.position === "finished");
  if (allFinished) {
    newState.winner = currentTurn;
    newState.turnPhase = "finished";
    return newState;
  }

  // Determine next turn
  if (diceValue === 6 && newState.consecutiveSixes < 2) {
    // Extra turn on 6 (max 3 consecutive sixes)
    newState.consecutiveSixes += 1;
    newState.turnPhase = "rolling";
    newState.diceValue = null;
  } else if (gotKill || gotHome) {
    // Extra turn for kill or getting token home
    newState.consecutiveSixes = 0;
    newState.turnPhase = "rolling";
    newState.diceValue = null;
  } else {
    // Next player's turn
    newState.consecutiveSixes = 0;
    newState.currentTurn = getNextPlayer(currentTurn, playerCount);
    newState.turnPhase = "rolling";
    newState.diceValue = null;
  }

  return newState;
}

function getNextPlayer(current: number, playerCount: number): number {
  return (current + 1) % playerCount;
}

function checkAndKill(state: GameState, currentPlayer: number, pathIndex: number): boolean {
  if (SAFE_POSITIONS.has(pathIndex)) return false;

  let killed = false;
  for (let p = 0; p < state.playerCount; p++) {
    if (p === currentPlayer) continue;
    for (let t = 0; t < 4; t++) {
      if (
        state.tokens[p][t].position === "path" &&
        state.tokens[p][t].pathIndex === pathIndex
      ) {
        // Send back home
        state.tokens[p][t] = { position: "home", pathIndex: 0 };
        killed = true;
      }
    }
  }
  return killed;
}

// Center triangle positions for finished tokens (one per color index)
// Each color gets a spot inside its triangle wedge near center (7.5, 7.5)
// Triangle vertices: (6,6)-(7.5,7.5)-(6,9), (6,6)-(7.5,7.5)-(9,6), (9,6)-(7.5,7.5)-(9,9), (6,9)-(7.5,7.5)-(9,9)
// Centroids of each wedge:
const FINISHED_POSITIONS: { row: number; col: number }[] = [
  { row: 7.5, col: 6.5 },   // Red (left wedge) - centroid of (6,6),(7.5,7.5),(9,6) mapped to row/col
  { row: 6.5, col: 7.5 },   // Green (top wedge)
  { row: 7.5, col: 8.5 },   // Yellow (right wedge)
  { row: 8.5, col: 7.5 },   // Blue (bottom wedge)
];

// Get pixel coordinates for a token on the board
export function getTokenCoords(
  playerIndex: number,
  token: TokenState,
  tokenIndex: number,
  cellSize: number
): { x: number; y: number } | null {
  if (token.position === "finished") {
    // Place finished tokens in the center triangle area
    // FINISHED_POSITIONS are already expressed as board-unit centers,
    // so we should not add another half-cell offset here.
    const pos = FINISHED_POSITIONS[playerIndex];
    const offsets = [
      { dx: -0.15, dy: -0.15 },
      { dx: 0.15, dy: -0.15 },
      { dx: -0.15, dy: 0.15 },
      { dx: 0.15, dy: 0.15 },
    ];
    const off = offsets[tokenIndex] || { dx: 0, dy: 0 };
    return {
      x: (pos.col + off.dx) * cellSize,
      y: (pos.row + off.dy) * cellSize,
    };
  }

  if (token.position === "home") {
    const origin = HOME_BASE_ORIGINS[playerIndex];
    const homePos = HOME_TOKEN_POSITIONS[tokenIndex];
    return {
      x: (origin.col + homePos.col) * cellSize + cellSize / 2,
      y: (origin.row + homePos.row) * cellSize + cellSize / 2,
    };
  }

  if (token.position === "path") {
    const cell = MAIN_PATH[token.pathIndex];
    return {
      x: cell.col * cellSize + cellSize / 2,
      y: cell.row * cellSize + cellSize / 2,
    };
  }

  if (token.position === "home_column") {
    const cell = HOME_COLUMNS[playerIndex][token.pathIndex];
    return {
      x: cell.col * cellSize + cellSize / 2,
      y: cell.row * cellSize + cellSize / 2,
    };
  }

  return null;
}
