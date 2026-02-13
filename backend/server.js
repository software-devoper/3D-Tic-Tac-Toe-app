import dotenv from "dotenv";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import { initializeSocket } from "./socket.js";
import { corsOriginValidator, getAllowedOrigins } from "./utils/cors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const server = http.createServer(app);

const port = Number(process.env.PORT || 4000);
const allowedOrigins = getAllowedOrigins(process.env.FRONTEND_URL);

app.use(
  cors({
    origin: corsOriginValidator(allowedOrigins),
    credentials: true
  })
);
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_, res) => {
  res.json({ ok: true, service: "3d-tic-tac-toe-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);

initializeSocket(server, allowedOrigins);

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message || "Internal server error." });
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});
