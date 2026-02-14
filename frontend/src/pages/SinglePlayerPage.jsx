import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Board from "../three/Board";
import { evaluateBoard } from "../utils/gameLogic";
import { api } from "../lib/api";

export default function SinglePlayerPage() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [busy, setBusy] = useState(false);
  const [winLine, setWinLine] = useState(null);
  const [message, setMessage] = useState("Your turn (X)");

  const result = useMemo(() => evaluateBoard(board), [board]);
  const gameEnded = Boolean(result.winner || result.isDraw);

  async function handlePlayerMove(index) {
    if (busy || turn !== "X" || board[index] !== null || gameEnded) {
      return;
    }

    const nextBoard = [...board];
    nextBoard[index] = "X";
    const playerEval = evaluateBoard(nextBoard);
    setBoard(nextBoard);

    if (playerEval.winner || playerEval.isDraw) {
      setWinLine(playerEval.winLine);
      setMessage(playerEval.winner ? "You win!" : "Draw game.");
      return;
    }

    setTurn("O");
    setMessage("Computer is thinking...");
    setBusy(true);

    try {
      const response = await api.post("/api/ai/move", { board: nextBoard });

      setBoard(response.data.board);
      setWinLine(response.data.winLine);

      if (response.data.winner) {
        setMessage("Computer wins.");
      } else if (response.data.isDraw) {
        setMessage("Draw game.");
      } else {
        setMessage("Your turn (X)");
      }

      setTurn("X");
    } catch (error) {
      const backendMessage = error?.response?.data?.error;
      if (backendMessage) {
        setMessage(`Computer move failed: ${backendMessage}`);
      } else {
        setMessage("Oops!404");
      }
      setTurn("X");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setBoard(Array(9).fill(null));
    setTurn("X");
    setWinLine(null);
    setMessage("Your turn (X)");
    setBusy(false);
  }

  return (
    <main className="shell">
      <Navbar />

      <section className="panel space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-white">Single Player</h1>
            <p className="muted text-sm">You are X. Computer is O.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={reset}>
              Restart
            </button>
            <Link className="btn-primary" to="/">
              Dashboard
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_220px] gap-4 items-start">
          <Board
            board={board}
            onSelect={handlePlayerMove}
            disabled={busy || turn !== "X" || gameEnded}
            winLine={winLine}
            winner={result.winner}
          />

          <div className="glass p-4 space-y-2">
            <p className="text-sm text-slate-200">Status</p>
            <p className="text-cyan-100 font-medium">{message}</p>
            <p className="text-xs text-slate-300">Turn: {turn}</p>
            <p className="text-xs text-slate-300">Mode: Human vs computer</p>
          </div>
        </div>
      </section>
    </main>
  );
}
