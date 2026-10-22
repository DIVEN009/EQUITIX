import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { BrandLogo } from "../components/BrandLogo";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  TrendingUp,
  BarChart3,
  Brain,
  Shield,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import { useSettingsStore } from "../store/settingsStore";

/**
 * Auth Page — Login / Register with professional design.
 * No background video. Clean, modern, trust-building layout.
 */
export const AuthPage = () => {
  const { theme, toggleTheme } = useSettingsStore();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });

  const {
    login,
    register,
    isLoggingIn,
    isRegistering,
    loginError,
    registerError,
  } = useAuth();

  const isSubmitting = isLoggingIn || isRegistering;
  const error = isLogin ? loginError : registerError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login({ email: formData.email, password: formData.password });
      } else {
        await register(formData);
      }
    } catch {
      // Errors handled by hook
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const features = [
    {
      icon: TrendingUp,
      title: "Real-Time Market Data",
      description: "Live stock quotes, charts, and analytics from global exchanges",
    },
    {
      icon: Brain,
      title: "ML-Powered Forecasting",
      description: "LSTM and Linear Regression models for 7-day price predictions",
    },
    {
      icon: BarChart3,
      title: "Portfolio Simulation",
      description: "Paper trade with virtual capital and track your performance",
    },
    {
      icon: Shield,
      title: "Institutional Grade",
      description: "Multi-currency support, real-time forex, and secure authentication",
    },
  ];

  return (
    <div className="min-h-screen bg-brand-bg flex">
      {/* Left Panel — Hero / Features (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500" />
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-black/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-48 h-48 rounded-full border border-white/20" />
        <div className="absolute bottom-1/3 right-1/4 w-32 h-32 rounded-full border border-white/10" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          <BrandLogo size="lg" className="[&_span]:!text-white" />
          
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-tight">
                Trade Smarter<br />
                with Precision<br />
                Intelligence
              </h1>
              <p className="text-lg text-white/80 max-w-md leading-relaxed">
                Your personal quantitative trading platform with ML-driven predictions, 
                real-time market data, and portfolio management.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-4 max-w-lg">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-300"
                  >
                    <Icon className="w-6 h-6 mb-2.5 text-white/90" />
                    <h3 className="text-sm font-bold mb-1">{f.title}</h3>
                    <p className="text-xs text-white/60 leading-relaxed">{f.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Equitix. Built with precision engineering.
          </p>
        </div>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        {/* Quick Theme Switcher */}
        <div className="absolute top-6 right-6">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-emerald/40 text-brand-textSecondary hover:text-brand-emerald transition-all duration-300 cursor-pointer shadow-sm"
            title={theme === "dark" ? "Switch to Light Theme" : "Switch to Midnight Dark Theme"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden">
            <BrandLogo size="lg" />
          </div>

          {/* Form Header */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-brand-textPrimary tracking-tight">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-brand-textMuted">
              {isLogin
                ? "Sign in to access your portfolios and market data."
                : "Start your trading journey with Equitix."}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 animate-slide-down">
              <AlertCircle className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-brand-red">Authentication Failed</p>
                <p className="text-xs text-brand-textSecondary mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields (Register only) */}
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3 animate-slide-up">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => updateField("first_name", e.target.value)}
                      placeholder="John"
                      required={!isLogin}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => updateField("last_name", e.target.value)}
                      placeholder="Doe"
                      required={!isLogin}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="input-field pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="input-field pl-10 pr-12"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-textMuted hover:text-brand-textPrimary transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? "Sign In" : "Create Account"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick Demo Access */}
            <div className="relative flex items-center justify-center pt-2">
              <div className="border-t border-brand-border w-full"></div>
              <span className="bg-brand-surface px-3 text-[11px] font-bold text-brand-textMuted uppercase tracking-wider shrink-0">
                Or
              </span>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
                try {
                  await login({ email: "demo@equitix.com", password: "password123" });
                } catch {
                  await register({
                    email: "demo@equitix.com",
                    password: "password123",
                    first_name: "Demo",
                    last_name: "Trader",
                  });
                }
              }}
              className="w-full py-3 rounded-2xl text-xs font-bold bg-brand-surface border border-brand-emerald/30 hover:border-brand-emerald text-brand-emerald hover:bg-brand-emerald/10 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Instant Demo Account (1-Click)</span>
            </button>
          </form>

          {/* Toggle Login / Register */}
          <div className="text-center pt-4">
            <p className="text-sm text-brand-textMuted">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFormData({ email: "", password: "", first_name: "", last_name: "" });
                }}
                className="ml-1.5 text-brand-emerald font-bold hover:underline cursor-pointer"
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
