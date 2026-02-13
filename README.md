# 3D Tic-Tac-Toe Multiplayer Web App

Production-ready full-stack app with Supabase Auth, 3D board rendering, Gemini AI mode, Socket.IO multiplayer rooms, spectator support, and room lifecycle cleanup.

## 1. Folder Structure

```text
3D Tic-Tac-Toe/
  backend/
    controllers/
      aiController.js
      authController.js
    routes/
      aiRoutes.js
      authRoutes.js
    services/
      geminiService.js
      roomService.js
      supabaseClient.js
    utils/
      authMiddleware.js
      gameLogic.js
    socket.js
    server.js
    package.json
    .env.example
  frontend/
    src/
      components/
        Navbar.jsx
      context/
        AuthContext.jsx
      hooks/
        useUserProfile.js
      lib/
        api.js
        socket.js
        supabase.js
      pages/
        DashboardPage.jsx
        LoginPage.jsx
        MultiplayerRoomPage.jsx
        SinglePlayerPage.jsx
      three/
        Board.jsx
      utils/
        gameLogic.js
      App.jsx
      main.jsx
      index.css
    index.html
    package.json
    tailwind.config.cjs
    postcss.config.cjs
    vite.config.js
    .env.example
  supabase/
    schema.sql
```

## 2. Backend Code

Key files:
- `backend/server.js`: Express API, middleware, health check, route mounting, Socket.IO bootstrap.
- `backend/socket.js`: Realtime room state management and events:
  - `join_room`
  - `raise_hand`
  - `approve_player`
  - `make_move`
  - `game_update`
  - `leave_room`
- `backend/routes/authRoutes.js`: profile sync endpoint.
- `backend/routes/aiRoutes.js`: Gemini AI move endpoint.
- `backend/services/roomService.js`: Supabase persistence for users/rooms/participants/games.
- `backend/services/geminiService.js`: Gemini integration and move fallback logic.

## 3. Frontend Code

Key files:
- `frontend/src/context/AuthContext.jsx`: Supabase auth session, login/signup/logout, profile sync.
- `frontend/src/pages/LoginPage.jsx`: email/password auth UI.
- `frontend/src/pages/DashboardPage.jsx`: idle animated 3D board + mode selection.
- `frontend/src/pages/SinglePlayerPage.jsx`: player-vs-Gemini flow.
- `frontend/src/pages/MultiplayerRoomPage.jsx`: room UI, host approvals, spectators, realtime updates.
- `frontend/src/three/Board.jsx`: Three.js-based 3D board and animated pieces.

## 4. Supabase SQL

Run `supabase/schema.sql` in Supabase SQL Editor to create:
- `users`
- `rooms`
- `room_participants`
- `games`

Includes FK constraints, indexes, timestamps, and RLS policies.

## 5. Gemini Integration

- Server endpoint: `POST /api/ai/move`
- Input body:
```json
{ "board": ["X", null, "O", null, null, null, null, null, null] }
```
- `backend/services/geminiService.js` sends board state JSON to Gemini.
- Gemini returns `{ "move": number }`.
- Server validates move against available cells.

## 6. Setup Instructions

1. Install dependencies:
```bash
cd backend && npm install
cd ../frontend && npm install
```

2. Configure backend env:
- Copy `backend/.env.example` to `backend/.env`
- Set:
  - `PORT=4000`
  - `FRONTEND_URL=http://localhost:5173`
  - `SUPABASE_URL=...`
  - `SUPABASE_ANON_KEY=...`
  - `GEMINI_API_KEY=...`

3. Configure frontend env:
- Copy `frontend/.env.example` to `frontend/.env`
- Set:
  - `VITE_SUPABASE_URL=...`
  - `VITE_SUPABASE_ANON_KEY=...`
  - `VITE_BACKEND_URL=http://localhost:4000`

4. Create DB schema:
- Run `supabase/schema.sql` in Supabase.

5. Start app:
```bash
cd backend && npm run dev
cd ../frontend && npm run dev
```

6. Open frontend:
- `http://localhost:5173`

## 7. Deployment Instructions (Replit + Render)

### Replit (Frontend + Backend together)
1. Import repo into Replit.
2. Add environment variables for backend and frontend values.
3. Build frontend:
```bash
cd frontend && npm install && npm run build
```
4. Start backend:
```bash
cd backend && npm install && npm start
```
5. Configure Replit web server to serve frontend build through static hosting or separate Replit deployment.

### Render (recommended split deploy)

#### Backend (Render Web Service)
1. Create new Web Service from repo.
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add env vars:
   - `PORT`
   - `FRONTEND_URL` (frontend Render URL)
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`

#### Frontend (Render Static Site)
1. Create Static Site from repo.
2. Root directory: `frontend`
3. Build command: `npm install && npm run build`
4. Publish directory: `dist`
5. Add env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BACKEND_URL` (backend Render URL)

After both are live, update `FRONTEND_URL` in backend env to the deployed frontend domain.
