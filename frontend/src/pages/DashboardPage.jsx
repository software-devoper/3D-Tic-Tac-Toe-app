import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Board from "../three/Board";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [joinValue, setJoinValue] = useState("");
  const [joinError, setJoinError] = useState("");

  function createRoom() {
    const roomId = crypto.randomUUID();
    navigate(`/room/${roomId}?host=1`);
  }

  function joinRoom() {
    setJoinError("");
    const value = joinValue.trim();
    if (!value) {
      setJoinError("Enter a room ID or invite link.");
      return;
    }

    let parsedRoomId = value;
    if (value.includes("/room/")) {
      try {
        const url = new URL(value);
        const segments = url.pathname.split("/").filter(Boolean);
        parsedRoomId = segments[segments.length - 1] || "";
      } catch (_error) {
        setJoinError("Invalid invite link.");
        return;
      }
    }

    const roomId = parsedRoomId.split("?")[0];
    const roomIdRegex = /^[0-9a-fA-F-]{8,}$/;
    if (!roomIdRegex.test(roomId)) {
      setJoinError("Room ID is invalid.");
      return;
    }

    navigate(`/room/${roomId}`);
  }

  return (
    <main className="shell">
      <Navbar />

      <section className="grid lg:grid-cols-2 gap-5 items-center">
        <div className="panel space-y-5">
          <span className="badge">Multiplayer + AI Ready</span>
          <h1 className="title">Play 3D Tic-Tac-Toe with realtime competition</h1>
          <p className="muted max-w-xl">
            Challenge Gemini 2.5 Flash in single-player mode, or host a room with live spectators and invite-based
            multiplayer.
          </p>
          <div className="flex gap-3 flex-wrap pt-1">
            <button className="btn-primary" onClick={() => navigate("/single-player")}>
              Play with Computer
            </button>
            <button className="btn-secondary" onClick={createRoom}>
              Play with Friend
            </button>
          </div>
          <div className="glass p-3 space-y-2">
            <p className="text-sm text-slate-200">Join Existing Room</p>
            <div className="flex gap-2">
              <input
                className="w-full rounded-xl bg-slate-900/80 border border-slate-700 px-3 py-2 text-sm"
                placeholder="Paste room ID or invite link"
                value={joinValue}
                onChange={(e) => setJoinValue(e.target.value)}
              />
              <button className="btn-primary" onClick={joinRoom}>
                Join
              </button>
            </div>
            {joinError ? <p className="text-xs text-red-300">{joinError}</p> : null}
          </div>
        </div>

        <div className="panel p-3 sm:p-4">
          <Board board={Array(9).fill(null)} onSelect={() => {}} idle disabled />
        </div>
      </section>
    </main>
  );
}
