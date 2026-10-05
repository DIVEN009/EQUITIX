import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, Loader2, User, Check } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { useAuth } from "../hooks/useAuth";
import { toast } from "../store/toastStore";

export const AuthPage = ({ onSuccess }) => {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState("");

  const { login, isLoggingIn, loginError, register, isRegistering, registerError } = useAuth();

  const isLoading = isLoggingIn || isRegistering;
  const apiError = mode === "login" ? loginError : registerError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    if (mode === "register") {
      if (!firstName.trim()) {
        setValidationError("Please enter your first name.");
        return;
      }
      if (!lastName.trim()) {
        setValidationError("Please enter your last name.");
        return;
      }
    }

    if (!email || !email.includes("@")) {
      setValidationError("Please enter a valid work or personal email address.");
      return;
    }

    if (!password || password.length < 6) {
      setValidationError("Password must be at least 6 characters long.");
      return;
    }

    if (mode === "register") {
      if (!confirmPassword) {
        setValidationError("Please confirm your password.");
        return;
      }
      if (password !== confirmPassword) {
        setValidationError("Passwords do not match.");
        return;
      }
    }

    try {
      if (mode === "login") {
        await login({ email: email.trim(), password });
        toast.success("Authenticated", "Welcome back to Equitix Intelligence.");
      } else {
        await register({
          email: email.trim().toLowerCase(),
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        });
        toast.success("Workspace Initialized", `Welcome to Equitix, ${firstName.trim()}!`);
      }
      if (onSuccess) onSuccess();
    } catch {
      // Error handled by TanStack mutation state
    }
  };

  const handleGoogleAuth = () => {
    toast.info("Institutional SSO", "Google OAuth SSO gateway will connect on production cloud launch.");
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Cinematic Looping Ambient Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        onTimeUpdate={(e) => {
          // Seamless loop across the glowing waveform segment
          if (e.target.currentTime >= 7.2) {
            e.target.currentTime = 0;
          }
        }}
        className="absolute inset-0 w-full h-full object-cover opacity-75 pointer-events-none scale-105 filter brightness-110 contrast-105"
      >
        <source src="/background-video.mp4" type="video/mp4" />
      </video>

      {/* Subtle Dark Vignette Overlay for crisp text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/55 pointer-events-none" />

      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-emerald/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-brand-cyan/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main translucent frosted-glass card */}
      <div
        className={`w-full ${
          mode === "register" ? "max-w-lg" : "max-w-md"
        } bg-[#0a0f1d]/50 backdrop-blur-2xl rounded-3xl p-8 shadow-[0_16px_48px_rgba(0,0,0,0.55)] relative z-10 border border-white/15 overflow-hidden transition-all duration-300 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-brand-emerald/40 before:to-transparent`}
      >
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3">
            <BrandLogo size="lg" layout="vertical" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white mt-1">
            {mode === "login" ? "Sign in to your account" : "Create your workspace"}
          </h1>
          <p className="text-xs text-brand-textMuted mt-1">
            {mode === "login"
              ? "Precision financial analytics & quantitative modeling"
              : "Set up your institutional quantitative workspace and analytics suite"}
          </p>
        </div>

        {/* Tab switcher: [Sign In] vs [Create Account] */}
        <div className="bg-black/30 backdrop-blur-md p-1 rounded-xl flex mb-6 border border-white/10">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setValidationError("");
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              mode === "login"
                ? "bg-white/10 text-brand-emerald shadow-sm border border-brand-emerald/30 font-bold"
                : "text-brand-textMuted hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setValidationError("");
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              mode === "register"
                ? "bg-white/10 text-brand-emerald shadow-sm border border-brand-emerald/30 font-bold"
                : "text-brand-textMuted hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error notification */}
        {(validationError || apiError) && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-400 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{validationError || apiError}</span>
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Detailed Registration Fields: First & Last Name */}
          {mode === "register" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-brand-textSecondary uppercase tracking-wider mb-1.5">
                  First Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-brand-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alex"
                    className="w-full bg-black/35 hover:bg-black/45 focus:bg-black/55 backdrop-blur-md border border-white/10 focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-brand-textMuted/70 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-brand-textSecondary uppercase tracking-wider mb-1.5">
                  Last Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-brand-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Morgan"
                    className="w-full bg-black/35 hover:bg-black/45 focus:bg-black/55 backdrop-blur-md border border-white/10 focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-brand-textMuted/70 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Email input */}
          <div>
            <label className="block text-[11px] font-semibold text-brand-textSecondary uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-brand-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@workplace.com"
                className="w-full bg-black/35 hover:bg-black/45 focus:bg-black/55 backdrop-blur-md border border-white/10 focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-brand-textMuted/70 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Password input */}
          <div>
            <label className="block text-[11px] font-semibold text-brand-textSecondary uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-brand-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "Minimum 6 characters" : "••••••••••••"}
                className="w-full bg-black/35 hover:bg-black/45 focus:bg-black/55 backdrop-blur-md border border-white/10 focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-brand-textMuted/70 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-textMuted hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password input (Registration mode only) */}
          {mode === "register" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold text-brand-textSecondary uppercase tracking-wider">
                  Confirm Password
                </label>
                {confirmPassword && (
                  <span
                    className={`text-[10px] font-semibold flex items-center gap-1 ${
                      password === confirmPassword ? "text-brand-emerald" : "text-amber-400"
                    }`}
                  >
                    {password === confirmPassword ? (
                      <>
                        <Check className="w-3 h-3" /> Passwords match
                      </>
                    ) : (
                      "Passwords do not match"
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-brand-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className={`w-full bg-black/35 hover:bg-black/45 focus:bg-black/55 backdrop-blur-md border rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-brand-textMuted/70 focus:outline-none transition-all ${
                    confirmPassword && password !== confirmPassword
                      ? "border-amber-500/50 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
                      : confirmPassword && password === confirmPassword
                      ? "border-brand-emerald/50 focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30"
                      : "border-white/10 focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-textMuted hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Remember me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-brand-textSecondary hover:text-white">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-white/20 bg-black/30 text-brand-emerald focus:ring-0"
              />
              <span>{mode === "login" ? "Remember me" : "I agree to Terms & Security Policy"}</span>
            </label>
            {mode === "login" && (
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Please contact administrator to reset password.");
                }}
                className="text-brand-textMuted hover:text-brand-emerald transition-colors"
              >
                Forgot password?
              </a>
            )}
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-emerald-glow py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer shadow-emeraldGlow"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-brand-bg" />
            ) : (
              <>
                <span>{mode === "login" ? "Sign In" : "Complete Registration"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-brand-textMuted">
            <span className="bg-[#0b101c] px-3 py-0.5 border border-white/10 rounded-full">Or continue with</span>
          </div>
        </div>

        {/* Google SSO Button */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          className="w-full bg-black/30 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer backdrop-blur-md"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.54 0 2.94.55 4.04 1.46l3.03-3.03C17.24 1.7 14.8 1 12 1 7.42 1 3.55 3.61 1.7 7.39l3.66 2.84C6.24 7.39 8.88 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.69 2.86c2.16-1.99 3.73-4.94 3.73-8.68z"
            />
            <path
              fill="#FBBC05"
              d="M5.36 14.77c-.23-.69-.36-1.43-.36-2.2s.13-1.51.36-2.2L1.7 7.39C.62 9.54 0 11.96 0 14.57s.62 5.03 1.7 7.18l3.66-2.84z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.69-2.86c-1.08.72-2.45 1.16-4.24 1.16-3.12 0-5.76-2.39-6.64-5.23L1.7 17.57C3.55 21.39 7.42 24 12 24z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Security badge footer */}
        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-brand-textMuted">
          <ShieldCheck className="w-4 h-4 text-brand-emerald" />
          <span>256-bit Bank-grade Encryption & SOC2 Certified</span>
        </div>
      </div>
    </div>
  );
};
