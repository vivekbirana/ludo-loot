// Ludo board constants and path definitions

// Player colors
export const PLAYER_COLORS = ["#E53E3E", "#38A169", "#D69E2E", "#3182CE"] as const;
export const PLAYER_NAMES = ["Red", "Green", "Yellow", "Blue"] as const;
export const PLAYER_BG = ["#FED7D7", "#C6F6D5", "#FEFCBF", "#BEE3F8"] as const;

// Board is 15x15 grid
export const BOARD_SIZE = 15;

// Starting positions for tokens in home base (relative to home base corner)
export const HOME_TOKEN_POSITIONS = [
  { row: 1, col: 1 },
  { row: 1, col: 3 },
  { row: 3, col: 1 },
  { row: 3, col: 3 },
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
  // Red start — left arm, row 6, going right (cells 0-4)
  { row: 6, col: 1 },  // 0 — Red start/safe
  { row: 6, col: 2 },  // 1
  { row: 6, col: 3 },  // 2
  { row: 6, col: 4 },  // 3
  { row: 6, col: 5 },  // 4
  // Top arm, col 6, going up (cells 5-10)
  { row: 5, col: 6 },  // 5
  { row: 4, col: 6 },  // 6
  { row: 3, col: 6 },  // 7
  { row: 2, col: 6 },  // 8 — safe
  { row: 1, col: 6 },  // 9
  { row: 0, col: 6 },  // 10
  // Top connecting cells (cells 11-12)
  { row: 0, col: 7 },  // 11
  { row: 0, col: 8 },  // 12
  // Top arm, col 8, going down (cells 13-17)
  { row: 1, col: 8 },  // 13 — Green start/safe
  { row: 2, col: 8 },  // 14
  { row: 3, col: 8 },  // 15
  { row: 4, col: 8 },  // 16
  { row: 5, col: 8 },  // 17
  // Right arm, row 6, going right (cells 18-23)
  { row: 6, col: 9 },  // 18
  { row: 6, col: 10 }, // 19
  { row: 6, col: 11 }, // 20
  { row: 6, col: 12 }, // 21 — safe
  { row: 6, col: 13 }, // 22
  { row: 6, col: 14 }, // 23
  // Right connecting cells (cells 24-25)
  { row: 7, col: 14 }, // 24
  { row: 8, col: 14 }, // 25
  // Right arm, row 8, going left (cells 26-30)
  { row: 8, col: 13 }, // 26 — Yellow start/safe
  { row: 8, col: 12 }, // 27
  { row: 8, col: 11 }, // 28
  { row: 8, col: 10 }, // 29
  { row: 8, col: 9 },  // 30
  // Bottom arm, col 8, going down (cells 31-36)
  { row: 9, col: 8 },  // 31
  { row: 10, col: 8 }, // 32
  { row: 11, col: 8 }, // 33
  { row: 12, col: 8 }, // 34 — safe
  { row: 13, col: 8 }, // 35
  { row: 14, col: 8 }, // 36
  // Bottom connecting cells (cells 37-38)
  { row: 14, col: 7 }, // 37
  { row: 14, col: 6 }, // 38
  // Bottom arm, col 6, going up (cells 39-43)
  { row: 13, col: 6 }, // 39 — Blue start/safe
  { row: 12, col: 6 }, // 40
  { row: 11, col: 6 }, // 41
  { row: 10, col: 6 }, // 42
  { row: 9, col: 6 },  // 43
  // Left arm, row 8, going left (cells 44-49)
  { row: 8, col: 5 },  // 44
  { row: 8, col: 4 },  // 45
  { row: 8, col: 3 },  // 46
  { row: 8, col: 2 },  // 47 — safe
  { row: 8, col: 1 },  // 48
  { row: 8, col: 0 },  // 49
  // Left connecting cells (cells 50-51)
  { row: 7, col: 0 },  // 50
  { row: 6, col: 0 },  // 51
  // Wraps back to cell 0: (6, 1)
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
export const HOME_ENTRY_POSITIONS = [51, 12, 25, 38];

export interface TokenState {
  position: "home" | "path" | "home_column" | "finished";
  pathIndex: number; // index on MAIN_PATH or HOME_COLUMNS
}

export interface GameState {
  tokens: TokenState[][]; // [playerIndex][tokenIndex]
  currentTurn: number; // player index
  diceValue: number | null;
  turnPhase: "rolling" | "moving" | "finished";
  consecutiveSixes: number;
  winner: number | null;
  playerCount: number;
}

export function createInitialGameState(playerCount: number): GameState {
  const tokens: TokenState[][] = [];
  for (let p = 0; p < playerCount; p++) {
    tokens.push([
      { position: "home", pathIndex: 0 },
      { position: "home", pathIndex: 0 },
      { position: "home", pathIndex: 0 },
      { position: "home", pathIndex: 0 },
    ]);
  }
  return {
    tokens,
    currentTurn: 0,
    diceValue: null,
    turnPhase: "rolling",
    consecutiveSixes: 0,
    winner: null,
    playerCount,
  };
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
      const startPos = START_POSITIONS[currentTurn];
      const homeEntry = HOME_ENTRY_POSITIONS[currentTurn];

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

export function moveToken(state: GameState, tokenIndex: number): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const { currentTurn, diceValue, playerCount } = newState;
  if (diceValue === null) return newState;

  const token = newState.tokens[currentTurn][tokenIndex];
  let gotKill = false;
  let gotHome = false;

  if (token.position === "home" && diceValue === 6) {
    // Move out of home to start position
    token.position = "path";
    token.pathIndex = START_POSITIONS[currentTurn];

    // Check for kills at start
    gotKill = checkAndKill(newState, currentTurn, token.pathIndex);
  } else if (token.position === "path") {
    const homeEntry = HOME_ENTRY_POSITIONS[currentTurn];
    const distToHome = ((homeEntry - token.pathIndex + 52) % 52);

    if (distToHome > 0 && distToHome <= diceValue) {
      // Enter home column
      const remaining = diceValue - distToHome;
      if (remaining === 0) {
        // Land on home entry, actually enter home column at index 0
        token.position = "home_column";
        token.pathIndex = 0;
      } else {
        token.position = "home_column";
        token.pathIndex = remaining - 1;
      }
      if (token.pathIndex === 5) {
        token.position = "finished";
        gotHome = true;
      }
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

// Get pixel coordinates for a token on the board
export function getTokenCoords(
  playerIndex: number,
  token: TokenState,
  tokenIndex: number,
  cellSize: number
): { x: number; y: number } | null {
  if (token.position === "finished") return null;

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
