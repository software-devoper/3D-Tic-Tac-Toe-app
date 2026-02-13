import { getAIMove } from "../services/geminiService.js";
import { applyMove, evaluateBoard } from "../utils/gameLogic.js";

export async function aiMove(req, res) {
  try {
    const { board } = req.body;

    if (!Array.isArray(board) || board.length !== 9) {
      return res.status(400).json({ error: "Board must be an array of length 9." });
    }

    const state = evaluateBoard(board);
    if (state.winner || state.isDraw) {
      return res.status(400).json({ error: "Game is already finished." });
    }

    const move = await getAIMove(board);
    if (move === null || move === undefined) {
      return res.status(400).json({ error: "No valid moves left." });
    }

    const nextBoard = applyMove(board, move, "O");
    const evaluation = evaluateBoard(nextBoard);

    res.json({
      move,
      board: nextBoard,
      winner: evaluation.winner,
      isDraw: evaluation.isDraw,
      winLine: evaluation.winLine
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to process AI move." });
  }
}
