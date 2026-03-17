import { useState } from "react";
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

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
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

          {/* Error banner */}
          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-600 leading-snug">
              {error}
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
