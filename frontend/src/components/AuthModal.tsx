import { useEffect, useState } from "react";
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
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("auth_error");
    if (oauthError) {
      setError(`Sign-in failed: ${decodeURIComponent(oauthError)}. Please try email/password instead.`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSuccess(null);
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

  function handleOAuth() {
    setError(null);
    window.location.href = "/auth/oauth";
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

          {/* OAuth */}
          <button
            type="button"
            onClick={handleOAuth}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 py-2.5 text-sm font-medium text-gray-700 transition-colors mb-4 shadow-sm"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Error / success banners shared between forms */}
          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-600 leading-snug">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-3.5 py-2.5 text-sm text-green-700">
              {success}
            </div>
          )}

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
                className="mt-1 w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 transition-colors"
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
                className="mt-1 w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 transition-colors"
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
          Passwords are hashed with PBKDF2-SHA256 · Sessions expire after 7 days · Your searches are private
        </p>
      </div>
    </div>
  );
}
