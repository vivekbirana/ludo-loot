import { useMemo } from "react";
import {
  BOARD_SIZE,
  MAIN_PATH,
  HOME_COLUMNS,
  SAFE_POSITIONS,
  HOME_BASE_ORIGINS,
  PLAYER_COLORS,
  PLAYER_BG,
  GameState,
  getTokenCoords,
  getMovableTokens,
} from "@/game/ludoEngine";
import { cn } from "@/lib/utils";

interface LudoBoardProps {
  gameState: GameState;
  currentPlayerId: number | null;
  onTokenClick: (tokenIndex: number) => void;
  isSpectator?: boolean;
}

const LudoBoard = ({ gameState, currentPlayerId, onTokenClick, isSpectator }: LudoBoardProps) => {
  const boardWidth = 330;
  const cellSize = boardWidth / BOARD_SIZE;

  const movableTokens = useMemo(() => {
    if (
      isSpectator ||
      currentPlayerId === null ||
      gameState.currentTurn !== currentPlayerId ||
      gameState.turnPhase !== "moving"
    ) {
      return [];
    }
    return getMovableTokens(gameState);
  }, [gameState, currentPlayerId, isSpectator]);

  // Build a set of main path coordinates for rendering
  const pathCells = useMemo(() => {
    const cells = new Map<string, { safe: boolean }>();
    MAIN_PATH.forEach((cell, idx) => {
      cells.set(`${cell.row}-${cell.col}`, { safe: SAFE_POSITIONS.has(idx) });
    });
    return cells;
  }, []);

  // Build home column cells
  const homeColumnCells = useMemo(() => {
    const cells = new Map<string, number>(); // key -> playerIndex
    HOME_COLUMNS.forEach((column, playerIdx) => {
      column.forEach((cell) => {
        cells.set(`${cell.row}-${cell.col}`, playerIdx);
      });
    });
    return cells;
  }, []);

  return (
    <div className="relative mx-auto" style={{ width: boardWidth, height: boardWidth }}>
      <svg
        viewBox={`0 0 ${boardWidth} ${boardWidth}`}
        width={boardWidth}
        height={boardWidth}
        className="rounded-xl"
      >
        {/* Background */}
        <rect width={boardWidth} height={boardWidth} fill="hsl(220, 15%, 12%)" rx="12" />

        {/* Home bases */}
        {HOME_BASE_ORIGINS.map((origin, idx) => (
          <g key={`home-${idx}`}>
            <rect
              x={origin.col * cellSize + 2}
              y={origin.row * cellSize + 2}
              width={cellSize * 6 - 4}
              height={cellSize * 6 - 4}
              fill={PLAYER_COLORS[idx]}
              opacity={0.15}
              rx="8"
            />
            <rect
              x={origin.col * cellSize + 2}
              y={origin.row * cellSize + 2}
              width={cellSize * 6 - 4}
              height={cellSize * 6 - 4}
              fill="none"
              stroke={PLAYER_COLORS[idx]}
              strokeWidth="1.5"
              opacity={0.4}
              rx="8"
            />
            {/* Inner home area */}
            <rect
              x={(origin.col + 0.5) * cellSize}
              y={(origin.row + 0.5) * cellSize}
              width={cellSize * 5}
              height={cellSize * 5}
              fill={PLAYER_COLORS[idx]}
              opacity={0.08}
              rx="6"
            />
          </g>
        ))}

        {/* Main path cells */}
        {MAIN_PATH.map((cell, idx) => {
          const isSafe = SAFE_POSITIONS.has(idx);
          return (
            <g key={`path-${idx}`}>
              <rect
                x={cell.col * cellSize + 1}
                y={cell.row * cellSize + 1}
                width={cellSize - 2}
                height={cellSize - 2}
                fill={isSafe ? "hsl(155, 60%, 20%)" : "hsl(220, 15%, 18%)"}
                stroke={isSafe ? "hsl(155, 60%, 35%)" : "hsl(220, 10%, 25%)"}
                strokeWidth="0.5"
                rx="2"
              />
              {isSafe && (
                <text
                  x={cell.col * cellSize + cellSize / 2}
                  y={cell.row * cellSize + cellSize / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="8"
                  fill="hsl(155, 60%, 50%)"
                >
                  ★
                </text>
              )}
            </g>
          );
        })}

        {/* Home columns */}
        {HOME_COLUMNS.map((column, playerIdx) =>
          column.map((cell, cellIdx) => (
            <rect
              key={`hc-${playerIdx}-${cellIdx}`}
              x={cell.col * cellSize + 1}
              y={cell.row * cellSize + 1}
              width={cellSize - 2}
              height={cellSize - 2}
              fill={PLAYER_COLORS[playerIdx]}
              opacity={0.2 + cellIdx * 0.05}
              stroke={PLAYER_COLORS[playerIdx]}
              strokeWidth="0.5"
              strokeOpacity={0.4}
              rx="2"
            />
          ))
        )}

        {/* Center triangle / finish area */}
        <polygon
          points={`${7 * cellSize},${6 * cellSize} ${7.5 * cellSize},${7.5 * cellSize} ${6 * cellSize},${7 * cellSize}`}
          fill={PLAYER_COLORS[0]}
          opacity={0.3}
        />
        <polygon
          points={`${6 * cellSize},${7 * cellSize} ${7.5 * cellSize},${7.5 * cellSize} ${7 * cellSize},${8 * cellSize}`}
          fill={PLAYER_COLORS[1]}
          opacity={0.3}
        />
        <polygon
          points={`${7 * cellSize},${8 * cellSize} ${7.5 * cellSize},${7.5 * cellSize} ${9 * cellSize},${7 * cellSize}`}
          fill={PLAYER_COLORS[2]}
          opacity={0.3}
        />
        <polygon
          points={`${9 * cellSize},${7 * cellSize} ${7.5 * cellSize},${7.5 * cellSize} ${8 * cellSize},${6 * cellSize}`}
          fill={PLAYER_COLORS[3]}
          opacity={0.3}
        />

        {/* Tokens */}
        {gameState.tokens.map((playerTokens, playerIdx) =>
          playerTokens.map((token, tokenIdx) => {
            const coords = getTokenCoords(playerIdx, token, tokenIdx, cellSize);
            if (!coords) return null;

            const isMovable =
              currentPlayerId === playerIdx && movableTokens.includes(tokenIdx);
            const isCurrentTurn = gameState.currentTurn === playerIdx;

            return (
              <g
                key={`token-${playerIdx}-${tokenIdx}`}
                onClick={() => isMovable && onTokenClick(tokenIdx)}
                style={{ cursor: isMovable ? "pointer" : "default" }}
              >
                {/* Glow for movable tokens */}
                {isMovable && (
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r={cellSize * 0.42}
                    fill={PLAYER_COLORS[playerIdx]}
                    opacity={0.3}
                    className="animate-pulse"
                  />
                )}
                {/* Token shadow */}
                <circle
                  cx={coords.x + 1}
                  cy={coords.y + 1}
                  r={cellSize * 0.32}
                  fill="rgba(0,0,0,0.3)"
                />
                {/* Token body */}
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r={cellSize * 0.32}
                  fill={PLAYER_COLORS[playerIdx]}
                  stroke={isMovable ? "#fff" : PLAYER_COLORS[playerIdx]}
                  strokeWidth={isMovable ? 2 : 1}
                  opacity={isCurrentTurn ? 1 : 0.7}
                />
                {/* Token inner */}
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r={cellSize * 0.15}
                  fill="rgba(255,255,255,0.3)"
                />
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
};

export default LudoBoard;
