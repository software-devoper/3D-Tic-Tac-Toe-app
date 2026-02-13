import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Board from "../three/Board";
import { createSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";
import useUserProfile from "../hooks/useUserProfile";

export default function MultiplayerRoomPage() {
  const { roomId } = useParams();
  const [params] = useSearchParams();
  const { session } = useAuth();
  const profile = useUserProfile();

  const socketRef = useRef(null);
  const [roomState, setRoomState] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const asHost = params.get("host") === "1";
  const isHost = Boolean(profile?.id && roomState?.hostId === profile.id);

  const me = useMemo(() => {
    if (!roomState || !profile) return null;
    return roomState.participants.find((p) => p.userId === profile.id) || null;
  }, [roomState, profile]);

  const mySymbol = useMemo(() => {
    if (!roomState || !profile) return null;
    if (roomState.players.X === profile.id) return "X";
    if (roomState.players.O === profile.id) return "O";
    return null;
  }, [roomState, profile]);

  const canMove = Boolean(
    roomState &&
      profile &&
      roomState.status === "playing" &&
      ((roomState.turn === "X" && roomState.players.X === profile.id) ||
        (roomState.turn === "O" && roomState.players.O === profile.id))
  );
  const raisedRequests = useMemo(
    () => (roomState?.participants || []).filter((p) => p.userId !== roomState?.hostId && p.handRaised),
    [roomState]
  );
  const canRaiseHand = Boolean(me && !isHost && !me.isApprovedPlayer && roomState?.status !== "playing");

  useEffect(() => {
    if (!session?.access_token || !profile || !roomId) return;

    const socket = createSocket({
      token: session.access_token,
      username: profile.username,
      avatarUrl: profile.avatarUrl
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_room", { roomId, asHost });
    });

    socket.on("game_update", (payload) => {
      setRoomState(payload);
      setError("");
    });

    socket.on("error_event", (payload) => {
      setError(payload.message || "Room event failed.");
    });

    socket.on("room_closed", (payload) => {
      setError(payload.message || "Room closed by host.");
      setRoomState(null);
    });

    return () => {
      socket.emit("leave_room", { roomId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session, profile, roomId, asHost]);

  function emitMove(index) {
    if (!socketRef.current || !canMove) return;
    socketRef.current.emit("make_move", { roomId, index });
  }

  function raiseHand(raised) {
    if (!socketRef.current) return;
    socketRef.current.emit("raise_hand", { roomId, raised });
  }

  function approvePlayer(userId) {
    if (!socketRef.current) return;
    socketRef.current.emit("approve_player", { roomId, userId });
  }

  function restartRound() {
    if (!socketRef.current) return;
    socketRef.current.emit("restart_game", { roomId });
  }

  function leavePartner() {
    if (!socketRef.current) return;
    socketRef.current.emit("leave_partner", { roomId });
  }

  const inviteLink = `${window.location.origin}/room/${roomId}`;

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_error) {
      setError("Could not copy invite link.");
    }
  }

  return (
    <main className="shell">
      <Navbar viewerCount={roomState?.viewerCount ?? 0} />

      <section className="grid lg:grid-cols-[1fr_340px] gap-4">
        <div className="panel space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-semibold text-white">Room {roomId?.slice(0, 8)}</h1>
              <p className="text-sm text-slate-300">Share this link to invite players and spectators.</p>
            </div>
            <Link className="btn-secondary" to="/">
              Dashboard
            </Link>
          </div>

          <div className="glass p-3">
            <p className="text-xs text-slate-300">Invite Link</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-cyan-100 break-all flex-1">{inviteLink}</p>
              <button className="btn-secondary text-xs px-3 py-1.5" onClick={copyInviteLink}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {roomState ? (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="badge">Status: {roomState.status}</span>
                <span className="badge">Turn: {roomState.turn}</span>
                {roomState.winnerUsername ? <span className="badge">Winner: {roomState.winnerUsername}</span> : null}
                {roomState.isDraw ? <span className="badge">Draw</span> : null}
              </div>

              {isHost && (roomState.status === "finished" || roomState.players?.O) ? (
                <div className="flex gap-2 flex-wrap">
                  {roomState.status === "finished" ? (
                    <button className="btn-primary" onClick={restartRound}>
                      Restart Round
                    </button>
                  ) : null}
                  {roomState.players?.O ? (
                    <button className="btn-secondary" onClick={leavePartner}>
                      Leave Partner
                    </button>
                  ) : null}
                </div>
              ) : null}

              {roomState.status === "finished" && roomState.winnerUsername ? (
                <p className="text-sm text-cyan-100">
                  Match finished. Winner is {roomState.winnerUsername}
                  {roomState.winnerUserId === roomState.hostId ? " (Host)" : ""}.
                </p>
              ) : null}

              <Board board={roomState.board} onSelect={emitMove} disabled={!canMove} winLine={roomState.winLine} />

              <p className="text-cyan-100 text-sm">{mySymbol ? `You are ${mySymbol}.` : "You are a spectator."}</p>
            </>
          ) : (
            <p className="text-slate-200">Connecting to room...</p>
          )}

          {error ? <p className="text-red-300 text-sm">{error}</p> : null}
        </div>

        <aside className="panel space-y-4">
          <h2 className="text-lg font-semibold text-white">Participants</h2>
          <ul className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {roomState?.participants?.map((p) => (
              <li key={p.userId} className="flex items-center justify-between gap-2 bg-slate-900/50 rounded-xl p-2.5 border border-white/10">
                <div className="flex items-center gap-2">
                  <img src={p.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full" />
                  <div>
                    <p className="text-sm font-medium text-slate-100">{p.username}</p>
                    <p className="text-xs text-slate-300">
                      {p.userId === roomState.hostId ? "Host" : p.isApprovedPlayer ? "Player O" : "Spectator"}
                    </p>
                  </div>
                </div>
                {p.handRaised ? <span className="text-xs text-cyan-200">Raised</span> : null}
                {isHost && p.userId !== roomState.hostId && p.handRaised && roomState.status !== "playing" ? (
                  <button className="btn-primary text-xs" onClick={() => approvePlayer(p.userId)}>
                    Approve
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          {isHost ? (
            <div className="glass p-3 space-y-2">
              <p className="text-sm text-slate-100">Play Requests</p>
              {raisedRequests.length ? (
                <div className="space-y-2">
                  {raisedRequests.map((request) => (
                    <div key={request.userId} className="flex items-center justify-between rounded-lg bg-slate-900/60 p-2">
                      <span className="text-sm text-slate-200">{request.username}</span>
                      <button
                        className="btn-primary text-xs"
                        onClick={() => approvePlayer(request.userId)}
                        disabled={roomState?.status === "playing"}
                      >
                        Approve
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-300">No raised hands right now.</p>
              )}
            </div>
          ) : null}

          {me && me.userId !== roomState?.hostId && !me.isApprovedPlayer ? (
            <div className="space-y-2">
              <button className="btn-primary w-full" onClick={() => raiseHand(true)} disabled={!canRaiseHand}>
                Raise Hand
              </button>
              <button className="btn-secondary w-full" onClick={() => raiseHand(false)} disabled={!canRaiseHand}>
                Lower Hand
              </button>
              {roomState?.status === "playing" ? (
                <p className="text-xs text-slate-300">Hand raise opens after this game ends.</p>
              ) : null}
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
