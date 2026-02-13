import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useUserProfile from "../hooks/useUserProfile";

export default function Navbar({ viewerCount = null }) {
  const { signOut } = useAuth();
  const profile = useUserProfile();

  return (
    <header className="glass px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-cyan-400/20 border border-cyan-300/40 flex items-center justify-center">
          <span className="text-cyan-200 font-bold">3D</span>
        </div>
        <div>
          <p className="font-semibold tracking-wide text-cyan-100 leading-tight">Tic-Tac-Toe</p>
          <p className="text-xs text-slate-300 leading-tight">Realtime Arena</p>
        </div>
      </Link>
      <div className="flex items-center gap-2 sm:gap-3">
        {viewerCount !== null ? (
          <span className="badge border-slate-200/20 bg-slate-800/70 text-slate-100">Viewers {viewerCount}</span>
        ) : null}
        {profile ? (
          <img src={profile.avatarUrl} alt="avatar" className="w-9 h-9 rounded-full border border-white/30" />
        ) : null}
        <button className="btn-secondary" onClick={signOut}>
          Logout
        </button>
      </div>
    </header>
  );
}