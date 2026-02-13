import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export function createSocket({ token, username, avatarUrl }) {
  return io(backendUrl, {
    transports: ["websocket"],
    auth: {
      token,
      username,
      avatarUrl
    }
  });
}
