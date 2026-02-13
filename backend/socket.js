import { Server } from "socket.io";
import { supabase } from "./services/supabaseClient.js";
import {
  addParticipant,
  approveGuestPlayer,
  closeRoom,
  createGame,
  createRoom,
  finishRoom,
  getLatestGameByRoomId,
  getRoomById,
  getRoomParticipants,
  removeParticipant,
  resetParticipantsForNextRound,
  setRoomWaiting,
  updateGame,
  updateRaiseHand
} from "./services/roomService.js";
import { applyMove, evaluateBoard } from "./utils/gameLogic.js";

const roomStates = new Map();

async function getUserFromSocket(socket) {
  const token = socket.handshake.auth?.token;
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

function serializeState(state) {
  const participants = Array.from(state.participants.values()).map((p) => ({
    userId: p.userId,
    username: p.username,
    avatarUrl: p.avatarUrl,
    role: p.role,
    handRaised: p.handRaised,
    isApprovedPlayer: p.isApprovedPlayer
  }));

  const viewerCount = participants.length;

  return {
    roomId: state.roomId,
    hostId: state.hostId,
    status: state.status,
    board: state.board,
    turn: state.turn,
    winner: state.winner,
    isDraw: state.isDraw,
    winLine: state.winLine,
    players: state.players,
    participants,
    viewerCount
  };
}

function emitRoomState(io, roomId) {
  const state = roomStates.get(roomId);
  if (!state) return;
  io.to(roomId).emit("game_update", serializeState(state));
}

function initializeRoomState({ roomId, hostId }) {
  return {
    roomId,
    hostId,
    status: "waiting",
    board: Array(9).fill(null),
    turn: "X",
    winner: null,
    isDraw: false,
    winLine: null,
    players: {
      X: hostId,
      O: null
    },
    participants: new Map()
  };
}

async function rebuildRoomStateFromDb(roomId) {
  const room = await getRoomById(roomId);
  if (!room) return null;

  const state = initializeRoomState({ roomId: room.id, hostId: room.host_id });
  state.status = room.status || "waiting";

  const participants = await getRoomParticipants(roomId);
  for (const participant of participants || []) {
    state.participants.set(participant.user_id, {
      userId: participant.user_id,
      username: participant.users?.username || "Player",
      avatarUrl: participant.users?.avatar_url || null,
      socketId: null,
      role: participant.role,
      handRaised: Boolean(participant.hand_raised),
      isApprovedPlayer: Boolean(participant.is_approved_player)
    });
  }

  const approvedGuest = (participants || []).find((p) => p.role === "guest" && p.is_approved_player);
  state.players.X = room.host_id;
  state.players.O = approvedGuest?.user_id || null;

  const latestGame = await getLatestGameByRoomId(roomId);
  if (latestGame) {
    state.board = Array.isArray(latestGame.board) ? latestGame.board : Array(9).fill(null);
    state.turn = latestGame.turn || "X";
    state.status = latestGame.status || state.status;
    state.winner = latestGame.winner && latestGame.winner !== "draw" ? latestGame.winner : null;
    state.isDraw = latestGame.winner === "draw";
    state.winLine = null;
  }

  return state;
}

function resetForNewGame(state) {
  state.board = Array(9).fill(null);
  state.turn = "X";
  state.winner = null;
  state.isDraw = false;
  state.winLine = null;
  state.status = "playing";
}

function isPlayerTurn(state, userId) {
  const expected = state.turn === "X" ? state.players.X : state.players.O;
  return expected === userId;
}

export function initializeSocket(httpServer, allowedOrigins) {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", async (socket) => {
    const user = await getUserFromSocket(socket);
    if (!user) {
      socket.emit("error_event", { message: "Unauthorized socket connection." });
      socket.disconnect(true);
      return;
    }

    socket.data.userId = user.id;
    socket.data.username =
      socket.handshake.auth?.username || user.user_metadata?.username || user.email?.split("@")[0] || "Player";
    socket.data.avatarUrl = socket.handshake.auth?.avatarUrl || user.user_metadata?.avatar_url || null;

    socket.on("join_room", async ({ roomId, asHost }) => {
      try {
        if (!roomId) {
          socket.emit("error_event", { message: "roomId is required." });
          return;
        }

        let state = roomStates.get(roomId);

        if (!state) {
          if (asHost) {
            state = initializeRoomState({ roomId, hostId: socket.data.userId });
            roomStates.set(roomId, state);
            await createRoom({ roomId, hostId: socket.data.userId });
          } else {
            // Recover room state from DB if in-memory state was lost (server restart, reconnect, etc.).
            state = await rebuildRoomStateFromDb(roomId);
            if (!state) {
              socket.emit("error_event", { message: "Room not found." });
              return;
            }
            roomStates.set(roomId, state);
          }
        }

        socket.join(roomId);
        socket.data.roomId = roomId;

        const existing = state.participants.get(socket.data.userId);
        const role = socket.data.userId === state.hostId ? "host" : existing?.role || "spectator";

        state.participants.set(socket.data.userId, {
          userId: socket.data.userId,
          username: socket.data.username,
          avatarUrl: socket.data.avatarUrl,
          socketId: socket.id,
          role,
          handRaised: existing?.handRaised || false,
          isApprovedPlayer: role === "host" || existing?.isApprovedPlayer || false
        });

        await addParticipant({ roomId, userId: socket.data.userId, role });
        emitRoomState(io, roomId);
      } catch (error) {
        socket.emit("error_event", { message: error.message || "Unable to join room." });
      }
    });

    socket.on("raise_hand", async ({ roomId, raised }) => {
      try {
        const state = roomStates.get(roomId);
        if (!state) return;

        const participant = state.participants.get(socket.data.userId);
        if (!participant || participant.role === "host" || participant.isApprovedPlayer) return;
        if (state.status === "playing") {
          socket.emit("error_event", { message: "Hand raise is available after the current game ends." });
          return;
        }

        participant.handRaised = Boolean(raised);
        participant.role = "spectator";
        await updateRaiseHand({ roomId, userId: socket.data.userId, raised: participant.handRaised });

        emitRoomState(io, roomId);
      } catch (error) {
        socket.emit("error_event", { message: error.message || "Failed to raise hand." });
      }
    });

    socket.on("approve_player", async ({ roomId, userId }) => {
      try {
        const state = roomStates.get(roomId);
        if (!state) return;

        if (socket.data.userId !== state.hostId) {
          socket.emit("error_event", { message: "Only host can approve a player." });
          return;
        }
        if (state.status === "playing") {
          socket.emit("error_event", { message: "Cannot approve a new player while a game is in progress." });
          return;
        }

        const selected = state.participants.get(userId);
        if (!selected) {
          socket.emit("error_event", { message: "Selected user not found in room." });
          return;
        }
        if (!selected.handRaised) {
          socket.emit("error_event", { message: "Only raised-hand participants can be approved." });
          return;
        }

        for (const participant of state.participants.values()) {
          if (participant.userId !== state.hostId) {
            participant.role = "spectator";
            participant.isApprovedPlayer = false;
            participant.handRaised = false;
          }
        }

        selected.role = "guest";
        selected.isApprovedPlayer = true;
        state.players.O = selected.userId;

        resetForNewGame(state);
        await approveGuestPlayer({ roomId, userId: selected.userId });
        await createGame({ roomId });

        emitRoomState(io, roomId);
      } catch (error) {
        socket.emit("error_event", { message: error.message || "Failed to approve player." });
      }
    });

    socket.on("make_move", async ({ roomId, index }) => {
      try {
        const state = roomStates.get(roomId);
        if (!state) return;

        if (state.status !== "playing") {
          socket.emit("error_event", { message: "Game is not active." });
          return;
        }

        if (!isPlayerTurn(state, socket.data.userId)) {
          socket.emit("error_event", { message: "Not your turn." });
          return;
        }

        const symbol = state.turn;
        state.board = applyMove(state.board, index, symbol);

        const evalResult = evaluateBoard(state.board);
        if (evalResult.winner || evalResult.isDraw) {
          state.status = "finished";
          state.winner = evalResult.winner;
          state.isDraw = evalResult.isDraw;
          state.winLine = evalResult.winLine;
          await finishRoom(roomId);
          await updateGame({
            roomId,
            board: state.board,
            turn: state.turn,
            status: "finished",
            winner: evalResult.winner || (evalResult.isDraw ? "draw" : null)
          });
        } else {
          state.turn = state.turn === "X" ? "O" : "X";
          await updateGame({
            roomId,
            board: state.board,
            turn: state.turn,
            status: "playing",
            winner: null
          });
        }

        emitRoomState(io, roomId);
      } catch (error) {
        socket.emit("error_event", { message: error.message || "Failed to make move." });
      }
    });

    socket.on("restart_game", async ({ roomId }) => {
      try {
        const state = roomStates.get(roomId);
        if (!state) return;

        if (socket.data.userId !== state.hostId) {
          socket.emit("error_event", { message: "Only host can restart the round." });
          return;
        }

        if (state.status !== "finished") {
          socket.emit("error_event", { message: "Round can be restarted only after game is finished." });
          return;
        }

        state.board = Array(9).fill(null);
        state.turn = "X";
        state.winner = null;
        state.isDraw = false;
        state.winLine = null;
        state.status = "waiting";
        state.players.O = null;

        for (const participant of state.participants.values()) {
          if (participant.userId !== state.hostId) {
            participant.role = "spectator";
            participant.isApprovedPlayer = false;
            participant.handRaised = false;
          }
        }

        await setRoomWaiting(roomId);
        await resetParticipantsForNextRound(roomId);
        emitRoomState(io, roomId);
      } catch (error) {
        socket.emit("error_event", { message: error.message || "Failed to restart round." });
      }
    });

    async function handleLeave(roomId) {
      const state = roomStates.get(roomId);
      if (!state) return;

      const leaving = state.participants.get(socket.data.userId);
      if (!leaving) return;

      state.participants.delete(socket.data.userId);
      await removeParticipant({ roomId, userId: socket.data.userId });

      if (socket.data.userId === state.hostId) {
        io.to(roomId).emit("room_closed", { message: "Host left. Room closed." });
        await closeRoom(roomId);
        roomStates.delete(roomId);
        io.in(roomId).socketsLeave(roomId);
        return;
      }

      if (state.status === "playing" && (state.players.X === socket.data.userId || state.players.O === socket.data.userId)) {
        state.status = "finished";
        state.winner = state.players.X === socket.data.userId ? "O" : "X";
        state.isDraw = false;
        state.winLine = null;
        await finishRoom(roomId);
      }

      if (state.players.O === socket.data.userId) {
        state.players.O = null;
        state.status = "waiting";
      }

      emitRoomState(io, roomId);
    }

    socket.on("leave_room", async ({ roomId }) => {
      try {
        await handleLeave(roomId);
        socket.leave(roomId);
      } catch (error) {
        socket.emit("error_event", { message: error.message || "Failed to leave room." });
      }
    });

    socket.on("disconnect", async () => {
      try {
        if (socket.data.roomId) {
          await handleLeave(socket.data.roomId);
        }
      } catch (error) {
        // Intentionally suppress disconnect errors.
      }
    });
  });

  return io;
}
