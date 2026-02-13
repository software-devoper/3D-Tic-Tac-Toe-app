export const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

export function evaluateBoard(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return { winner: board[a], isDraw: false, winLine: [a, b, c] };
    }
  }

  const isDraw = board.every((cell) => cell !== null);
  return { winner: null, isDraw, winLine: null };
}

export function applyMove(board, index, symbol) {
  if (index < 0 || index > 8) {
    throw new Error("Move index out of range.");
  }

  if (board[index] !== null) {
    throw new Error("Cell already occupied.");
  }

  const next = [...board];
  next[index] = symbol;
  return next;
}
