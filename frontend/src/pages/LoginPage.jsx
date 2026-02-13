import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp } = useAuth();

  const [isSignup, setIsSignup] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function resolveEmailByUsername(rawUsername) {
    const normalizedUsername = rawUsername.trim().toLowerCase();
    if (!normalizedUsername) {
      throw new Error("Username is required.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("email")
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Could not read username profile: ${profileError.message}`);
    }

    if (!profile?.email) {
      throw new Error("Username not found. Create account first or check users table in Supabase.");
    }

    return profile.email;
  }

  async function handleResendVerification() {
    setError("");
    setInfo("");

    try {
      const resolvedEmail = await resolveEmailByUsername(loginUsername);
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: resolvedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (resendError) {
        throw resendError;
      }

      setInfo("Verification email sent. Check inbox and spam folder.");
    } catch (resendError) {
      setError(resendError.message || "Failed to resend verification email.");
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);

    try {
      const redirectTo = searchParams.get("redirect") || "/";

      if (isSignup) {
        const normalizedSignupUsername = username.trim().toLowerCase();
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedSignupUsername) {
          throw new Error("Username is required.");
        }

        const { data, error: signUpError } = await signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { username: normalizedSignupUsername },
            emailRedirectTo: `${window.location.origin}/login`
          }
        });

        if (signUpError) {
          throw signUpError;
        }

        if (data?.user) {
          const { error: upsertError } = await supabase.from("users").upsert(
            {
              id: data.user.id,
              username: normalizedSignupUsername,
              email: normalizedEmail,
              avatar_url: null
            },
            { onConflict: "id" }
          );

          if (upsertError) {
            throw new Error(`Signup created auth user, but profile save failed: ${upsertError.message}`);
          }
        }

        // If confirm-email is enabled in Supabase, session is null until email verification.
        if (!data?.session) {
          setInfo("Account created. Check your email and verify your account, then login.");
          setIsSignup(false);
          setLoginUsername(normalizedSignupUsername);
          return;
        }
      } else {
        const resolvedEmail = await resolveEmailByUsername(loginUsername);

        const { error: signInError } = await signIn({ email: resolvedEmail, password });
        if (signInError) {
          if (signInError.message?.toLowerCase().includes("email not confirmed")) {
            throw new Error("Please verify your email first, then try logging in.");
          }
          throw new Error("Invalid username or password.");
        }
      }

      navigate(redirectTo);
    } catch (submitError) {
      setError(submitError.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <section className="glass w-full max-w-md p-6 sm:p-7">
        <div className="mb-5">
          <span className="badge">Secure Access</span>
          <h1 className="text-2xl font-semibold text-white mt-3">3D Tic-Tac-Toe</h1>
          <p className="text-sm text-slate-300 mt-1">Login or create your account to access multiplayer and AI modes.</p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          {isSignup ? (
            <label className="block">
              <span className="text-sm">Username</span>
              <input
                className="w-full mt-1 rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>
          ) : null}

          {isSignup ? (
            <label className="block">
              <span className="text-sm">Email</span>
              <input
                type="email"
                className="w-full mt-1 rounded-xl bg-slate-900/80 border border-slate-700 px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-sm">Username</span>
              <input
                className="w-full mt-1 rounded-xl bg-slate-900/80 border border-slate-700 px-3 py-2"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
              />
            </label>
          )}

          <label className="block">
            <span className="text-sm">Password</span>
            <input
              type="password"
              className="w-full mt-1 rounded-xl bg-slate-900/80 border border-slate-700 px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>

          {error ? <p className="text-red-300 text-sm">{error}</p> : null}
          {info ? <p className="text-cyan-200 text-sm">{info}</p> : null}

          <button className="btn-primary w-full" disabled={busy} type="submit">
            {busy ? "Please wait..." : isSignup ? "Create Account" : "Login"}
          </button>
        </form>

        <button
          className="mt-4 text-sm text-cyan-300 underline"
          onClick={() => setIsSignup((prev) => !prev)}
          type="button"
        >
          {isSignup ? "Already registered? Login" : "New player? Create account"}
        </button>
        {!isSignup ? (
          <button className="mt-2 text-sm text-cyan-300 underline" onClick={handleResendVerification} type="button">
            Resend verification email
          </button>
        ) : null}
      </section>
    </main>
  );
}
