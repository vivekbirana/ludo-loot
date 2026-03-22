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
        <rect width={boardWidth} height={boardWidth} fill="hsl(40, 30%, 95%)" rx="12" />

        {/* Home bases */}
        {HOME_BASE_ORIGINS.map((origin, idx) => {
          const isBorder = (row: number, col: number) =>
            row === 0 || row === 5 || col === 0 || col === 5;
          return (
            <g key={`home-${idx}`}>
              <rect
                x={origin.col * cellSize}
                y={origin.row * cellSize}
                width={cellSize * 6}
                height={cellSize * 6}
                fill={PLAYER_COLORS[idx]}
                opacity={0.08}
              />
              {/* Grid overlay */}
              {Array.from({ length: 6 }, (_, row) =>
                Array.from({ length: 6 }, (_, col) => (
                  <g key={`grid-${idx}-${row}-${col}`}>
                    <rect
                      x={(origin.col + col) * cellSize}
                      y={(origin.row + row) * cellSize}
                      width={cellSize}
                      height={cellSize}
                      fill={isBorder(row, col) ? PLAYER_COLORS[idx] : "none"}
                      opacity={isBorder(row, col) ? 0.35 : 1}
                      stroke="rgba(0,0,0,0.15)"
                      strokeWidth="0.5"
                    />
                    <text
                      x={(origin.col + col) * cellSize + cellSize / 2}
                      y={(origin.row + row) * cellSize + cellSize / 2 + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="5"
                      fill="rgba(0,0,0,0.3)"
                      fontFamily="monospace"
                    >
                      {row},{col}
                    </text>
                  </g>
                ))
              )}
            </g>
          );
        })}

        {/* Main path cells */}
        {MAIN_PATH.map((cell, idx) => {
          const isSafe = SAFE_POSITIONS.has(idx);
          // Color start tiles with their player's color
          const startColorMap: Record<number, string> = { 13: PLAYER_COLORS[0], 26: PLAYER_COLORS[1], 39: PLAYER_COLORS[2], 0: PLAYER_COLORS[3] };
          const tileFill = startColorMap[idx] || "white";
          return (
            <g key={`path-${idx}`}>
              <rect
                x={cell.col * cellSize}
                y={cell.row * cellSize}
                width={cellSize}
                height={cellSize}
                fill={tileFill}
                stroke="black"
                strokeWidth="0.5"
              />
              <text
                x={cell.col * cellSize + cellSize / 2}
                y={cell.row * cellSize + cellSize / 2 + (isSafe ? -3 : 1)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="6"
                fill={startColorMap[idx] ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.35)"}
                fontFamily="monospace"
              >
                {idx}
              </text>
              {isSafe && !startColorMap[idx] && (() => {
                const cx = cell.col * cellSize + cellSize / 2;
                const cy = cell.row * cellSize + cellSize / 2;
                const r = cellSize * 0.4;
                const ri = r * 0.38;
                const points = Array.from({ length: 10 }, (_, i) => {
                  const angle = (Math.PI / 2) * -1 + (Math.PI / 5) * i;
                  const rad = i % 2 === 0 ? r : ri;
                  return `${cx + rad * Math.cos(angle)},${cy + rad * Math.sin(angle)}`;
                }).join(" ");
                return (
                  <polygon
                    points={points}
                    fill="none"
                    stroke="rgba(0,0,0,0.25)"
                    strokeWidth="1.2"
                  />
                );
              })()}
            </g>
          );
        })}

        {/* Home columns */}
        {HOME_COLUMNS.map((column, playerIdx) =>
          column.slice(0, 5).map((cell, cellIdx) => (
            <g key={`hc-${playerIdx}-${cellIdx}`}>
              <rect
                x={cell.col * cellSize}
                y={cell.row * cellSize}
                width={cellSize}
                height={cellSize}
                fill={PLAYER_COLORS[playerIdx]}
                stroke="black"
                strokeWidth="0.5"
              />
              <text
                x={cell.col * cellSize + cellSize / 2}
                y={cell.row * cellSize + cellSize / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="6"
                fill="rgba(255,255,255,0.7)"
                fontFamily="monospace"
              >
                H{cellIdx}
              </text>
            </g>
          ))
        )}

        {/* Center triangle / finish area */}
        {/* Red: enters from left, triangle points right */}
        <polygon
          points={`${6 * cellSize},${6 * cellSize} ${7.5 * cellSize},${7.5 * cellSize} ${6 * cellSize},${9 * cellSize}`}
          fill={PLAYER_COLORS[0]}
          opacity={1}
        />
        <text x={6.5 * cellSize} y={7.5 * cellSize} textAnchor="middle" dominantBaseline="middle" fontSize="6" fill="rgba(255,255,255,0.7)" fontFamily="monospace">H5</text>
        {/* Green: enters from top, triangle points down */}
        <polygon
          points={`${6 * cellSize},${6 * cellSize} ${7.5 * cellSize},${7.5 * cellSize} ${9 * cellSize},${6 * cellSize}`}
          fill={PLAYER_COLORS[1]}
          opacity={1}
        />
        <text x={7.5 * cellSize} y={6.5 * cellSize} textAnchor="middle" dominantBaseline="middle" fontSize="6" fill="rgba(255,255,255,0.7)" fontFamily="monospace">H5</text>
        {/* Yellow: enters from right, triangle points left */}
        <polygon
          points={`${9 * cellSize},${6 * cellSize} ${7.5 * cellSize},${7.5 * cellSize} ${9 * cellSize},${9 * cellSize}`}
          fill={PLAYER_COLORS[2]}
          opacity={1}
        />
        <text x={8.5 * cellSize} y={7.5 * cellSize} textAnchor="middle" dominantBaseline="middle" fontSize="6" fill="rgba(255,255,255,0.7)" fontFamily="monospace">H5</text>
        {/* Blue: enters from bottom, triangle points up */}
        <polygon
          points={`${6 * cellSize},${9 * cellSize} ${7.5 * cellSize},${7.5 * cellSize} ${9 * cellSize},${9 * cellSize}`}
          fill={PLAYER_COLORS[3]}
          opacity={1}
        />
        <text x={7.5 * cellSize} y={8.5 * cellSize} textAnchor="middle" dominantBaseline="middle" fontSize="6" fill="rgba(255,255,255,0.7)" fontFamily="monospace">H5</text>

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
                  fill="rgba(0,0,0,0.12)"
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
