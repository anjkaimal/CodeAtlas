import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { loginWithEmail, registerWithEmail } from "../api/client";

type Mode = "login" | "register";

const EMPTY_LOGIN = { email: "", password: "" };
const EMPTY_REGISTER = { email: "", name: "", password: "", confirm: "" };

export default function AuthModal() {
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>("login");

  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN);
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Pick up ?auth_error= set by the Google OAuth callback when something goes wrong.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthErr = params.get("auth_error");
    if (oauthErr) {
      setError(`Google sign-in failed: ${decodeURIComponent(oauthErr)}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  function handleGoogleSignIn() {
    setGoogleLoading(true);
    // Redirect to backend — it will forward to Google and back.
    window.location.href = "/auth/google";
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await loginWithEmail(loginForm.email.trim(), loginForm.password);
      login(result.token, result.user);
    } catch (err: any) {
      setError(err?.message || "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (registerForm.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (registerForm.password !== registerForm.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const result = await registerWithEmail(
        registerForm.email.trim(),
        registerForm.name.trim(),
        registerForm.password,
      );
      login(result.token, result.user);
    } catch (err: any) {
      setError(err?.message || "Account creation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <div className="min-h-screen hero-gradient flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-violet-600 shadow-lg mb-4">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold purple-gradient-text mb-1">CodeAtlas</h1>
          <p className="text-sm text-gray-500">AI-powered repository explorer</p>
        </div>

        <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-8">
          {/* Error banner */}
          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-600 leading-snug">
              {error}
            </div>
          )}

          {/* Google sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors"
          >
            {googleLoading ? (
              <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                mode === "login" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                mode === "register" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* ── SIGN IN FORM ── */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  placeholder="you@example.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  placeholder="Your password"
                  className={inputCls}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 transition-colors"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
              <p className="text-center text-xs text-gray-400">
                Don't have an account?{" "}
                <button type="button" onClick={() => switchMode("register")} className="text-violet-600 font-medium hover:underline">
                  Create one
                </button>
              </p>
            </form>
          )}

          {/* ── CREATE ACCOUNT FORM ── */}
          {mode === "register" && (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3">
              <div>
                <label className={labelCls}>Full Name</label>
                <input
                  type="text"
                  autoComplete="name"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Jane Smith"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  placeholder="you@example.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  placeholder="Min. 6 characters"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Confirm Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={registerForm.confirm}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, confirm: e.target.value }))}
                  required
                  placeholder="Re-enter password"
                  className={inputCls}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 transition-colors"
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
              <p className="text-center text-xs text-gray-400">
                Already have an account?{" "}
                <button type="button" onClick={() => switchMode("login")} className="text-violet-600 font-medium hover:underline">
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Passwords hashed · Sessions expire after 7 days · Searches are private
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
