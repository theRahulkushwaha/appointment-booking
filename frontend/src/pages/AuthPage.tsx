import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

type AuthMode = "login" | "signup";

export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Invalid email format";
    if (!password) next.password = "Password is required";
    else if (password.length < 8) next.password = "Password must be at least 8 characters";
    if (mode === "signup") {
      if (!name.trim()) next.name = "Name is required";
      if (password !== confirmPassword) next.confirmPassword = "Passwords do not match";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "login") {
        await login({ email: email.trim(), password });
        toast.success("Welcome back!");
      } else {
        await register({ email: email.trim(), password, name: name.trim() });
        toast.success("Account created successfully!");
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-4xl font-bold text-primary">BookSlot</h1>
        <p className="mt-2 text-secondary">Multi-timezone appointment booking made simple</p>
      </div>

      <div className="glass-card w-full max-w-md rounded-2xl p-6 md:p-8">
        <div className="mb-6 flex rounded-lg border border-border bg-hover p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrors({});
            }}
            className={`min-h-[44px] flex-1 rounded-md text-sm font-medium transition-all duration-200 ${
              mode === "login" ? "nav-tab-active" : "text-secondary hover:text-primary"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrors({});
            }}
            className={`min-h-[44px] flex-1 rounded-md text-sm font-medium transition-all duration-200 ${
              mode === "signup" ? "nav-tab-active" : "text-secondary hover:text-primary"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-primary">
                Full name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field min-h-[44px] w-full rounded-lg px-3 py-2"
                placeholder="John Doe"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-danger">{errors.name}</p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-primary">
              Email <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field min-h-[44px] w-full rounded-lg px-3 py-2"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-danger">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-primary">
              Password <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field min-h-[44px] w-full rounded-lg px-3 py-2 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
                aria-label="Toggle password"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-danger">{errors.password}</p>
            )}
          </div>

          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-primary">
                Confirm password <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field min-h-[44px] w-full rounded-lg px-3 py-2 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
                  aria-label="Toggle confirm password"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-danger">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {mode === "login" && (
            <button
              type="button"
              className="text-sm text-accent transition-colors duration-200 hover:underline"
            >
              Forgot password?
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-cta flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium disabled:opacity-60"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
