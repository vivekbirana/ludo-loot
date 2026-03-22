import { useMemo, useRef, useEffect } from "react";
import {
  BOARD_SIZE,
  MAIN_PATH,
  HOME_COLUMNS,
  SAFE_POSITIONS,
  HOME_BASE_ORIGINS,
  PLAYER_COLORS,
  PLAYER_COLORS_LIGHT,
  PLAYER_BG,
  GameState,
  getTokenCoords,
  getMovableTokens,
} from "@/game/ludoEngine";
import { cn } from "@/lib/utils";
import { playTokenMoveSound } from "@/utils/sounds";

interface LudoBoardProps {
  gameState: GameState;
  currentPlayerId: number | null;
  onTokenClick: (tokenIndex: number) => void;
  isSpectator?: boolean;
}

const LudoBoard = ({ gameState, currentPlayerId, onTokenClick, isSpectator }: LudoBoardProps) => {
  const boardWidth = 363;
  const cellSize = boardWidth / BOARD_SIZE;
  const prevTokensRef = useRef<string>("");

  // Play sound on token position changes
  useEffect(() => {
    const key = JSON.stringify(gameState.tokens);
    if (prevTokensRef.current && prevTokensRef.current !== key) {
      playTokenMoveSound();
    }
    prevTokensRef.current = key;
  }, [gameState.tokens]);

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

  const getSeatColorIndex = (seat: number) => gameState.colorOrder?.[seat] ?? seat;

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
                fill="white"
              />
              {Array.from({ length: 6 }, (_, row) =>
                Array.from({ length: 6 }, (_, col) => (
                  <g key={`grid-${idx}-${row}-${col}`}>
                    <rect
                      x={(origin.col + col) * cellSize}
                      y={(origin.row + row) * cellSize}
                      width={cellSize}
                      height={cellSize}
                      fill={isBorder(row, col) ? PLAYER_COLORS[idx] : "white"}
                      stroke="rgba(0,0,0,0.15)"
                      strokeWidth="0.5"
                    />
                  </g>
                ))
              )}
            </g>
          );
        })}

        {/* Main path cells */}
        {MAIN_PATH.map((cell, idx) => {
          const isSafe = SAFE_POSITIONS.has(idx);
          const startColorMap: Record<number, string> = { 13: PLAYER_COLORS_LIGHT[0], 26: PLAYER_COLORS_LIGHT[1], 39: PLAYER_COLORS_LIGHT[2], 0: PLAYER_COLORS_LIGHT[3] };
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

        {/* Home columns - use lighter colors */}
        {HOME_COLUMNS.map((column, playerIdx) =>
          column.slice(0, 5).map((cell, cellIdx) => (
            <g key={`hc-${playerIdx}-${cellIdx}`}>
              <rect
                x={cell.col * cellSize}
                y={cell.row * cellSize}
                width={cellSize}
                height={cellSize}
                fill={PLAYER_COLORS_LIGHT[playerIdx]}
                stroke="black"
                strokeWidth="0.5"
              />
            </g>
          ))
        )}

        {/* Center triangle / finish area - use lighter colors */}
        <polygon
          points={`${6 * cellSize},${6 * cellSize} ${7.5 * cellSize},${7.5 * cellSize} ${6 * cellSize},${9 * cellSize}`}
          fill={PLAYER_COLORS_LIGHT[0]}
          opacity={1}
        />
        <polygon
          points={`${6 * cellSize},${6 * cellSize} ${7.5 * cellSize},${7.5 * cellSize} ${9 * cellSize},${6 * cellSize}`}
          fill={PLAYER_COLORS_LIGHT[1]}
          opacity={1}
        />
        <polygon
          points={`${9 * cellSize},${6 * cellSize} ${7.5 * cellSize},${7.5 * cellSize} ${9 * cellSize},${9 * cellSize}`}
          fill={PLAYER_COLORS_LIGHT[2]}
          opacity={1}
        />
        <polygon
          points={`${6 * cellSize},${9 * cellSize} ${7.5 * cellSize},${7.5 * cellSize} ${9 * cellSize},${9 * cellSize}`}
          fill={PLAYER_COLORS_LIGHT[3]}
          opacity={1}
        />

        {/* Tokens with CSS transitions for movement */}
        {(() => {
          // Build a map of cell keys to count tokens on same cell for stacking offsets
          const cellOccupancy: Record<string, { playerSeat: number; tokenIdx: number; colorIdx: number }[]> = {};
          gameState.tokens.forEach((playerTokens, playerSeat) => {
            playerTokens.forEach((token, tokenIdx) => {
              if (token.position === "finished" || token.position === "home") return;
              const colorIdx = getSeatColorIndex(playerSeat);
              const key = `${token.position}-${colorIdx}-${token.pathIndex}`;
              // For path tokens, use a global key so different colors on same cell stack
              const cellKey = token.position === "path" ? `path-${token.pathIndex}` : key;
              if (!cellOccupancy[cellKey]) cellOccupancy[cellKey] = [];
              cellOccupancy[cellKey].push({ playerSeat, tokenIdx, colorIdx });
            });
          });

          const stackOffsets = [
            { dx: -0.25, dy: -0.25 },
            { dx: 0.25, dy: -0.25 },
            { dx: -0.25, dy: 0.25 },
            { dx: 0.25, dy: 0.25 },
          ];

          return gameState.tokens.map((playerTokens, playerSeat) =>
            playerTokens.map((token, tokenIdx) => {
              const colorIdx = getSeatColorIndex(playerSeat);
              const color = PLAYER_COLORS[colorIdx];
              const coords = getTokenCoords(colorIdx, token, tokenIdx, cellSize);
              if (!coords) return null;

              // Apply stacking offset for non-home, non-finished tokens
              let finalX = coords.x;
              let finalY = coords.y;
              if (token.position !== "home" && token.position !== "finished") {
                const cellKey = token.position === "path" ? `path-${token.pathIndex}` : `${token.position}-${colorIdx}-${token.pathIndex}`;
                const group = cellOccupancy[cellKey];
                if (group && group.length > 1) {
                  const myIdx = group.findIndex(g => g.playerSeat === playerSeat && g.tokenIdx === tokenIdx);
                  if (myIdx >= 0 && myIdx < stackOffsets.length) {
                    finalX += stackOffsets[myIdx].dx * cellSize;
                    finalY += stackOffsets[myIdx].dy * cellSize;
                  }
                }
              }

              const isMovable =
                currentPlayerId === playerSeat && movableTokens.includes(tokenIdx);
              const isCurrentTurn = gameState.currentTurn === playerSeat;
              const isFinished = token.position === "finished";

              return (
                <g
                  key={`token-${playerSeat}-${tokenIdx}`}
                  onClick={() => isMovable && onTokenClick(tokenIdx)}
                  style={{
                    cursor: isMovable ? "pointer" : "default",
                    transform: `translate(${finalX}px, ${finalY}px)`,
                    transition: "transform 0.3s ease-in-out",
                  }}
                >
                  {/* Glow for movable tokens */}
                  {isMovable && (
                    <circle
                      cx={0}
                      cy={0}
                      r={cellSize * 0.42}
                      fill={color}
                      opacity={0.3}
                      className="animate-pulse"
                    />
                  )}
                  {/* Token shadow */}
                  <circle
                    cx={1}
                    cy={1}
                    r={isFinished ? cellSize * 0.22 : cellSize * 0.32}
                    fill="rgba(0,0,0,0.12)"
                  />
                  {/* Token body */}
                  <circle
                    cx={0}
                    cy={0}
                    r={isFinished ? cellSize * 0.22 : cellSize * 0.32}
                    fill={color}
                    stroke="#000"
                    strokeWidth={isMovable ? 2 : 1.2}
                    opacity={isCurrentTurn || isFinished ? 1 : 0.7}
                  />
                  {/* Token inner */}
                  <circle
                    cx={0}
                    cy={0}
                    r={isFinished ? cellSize * 0.1 : cellSize * 0.15}
                    fill="rgba(255,255,255,0.3)"
                  />
                </g>
              );
            })
          );
        })()}
      </svg>
    </div>
  );
};

export default LudoBoard;
