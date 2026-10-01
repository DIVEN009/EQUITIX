import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { useToastStore } from "../store/toastStore";

export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => {
        const isSuccess = t.type === "success";
        const isError = t.type === "error";
        const isWarning = t.type === "warning";

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
              isSuccess
                ? "bg-brand-surface/95 border-brand-emerald/40 text-white shadow-emeraldGlow/20"
                : isError
                ? "bg-brand-surface/95 border-brand-red/40 text-white"
                : isWarning
                ? "bg-brand-surface/95 border-amber-500/40 text-white"
                : "bg-brand-surface/95 border-white/10 text-white"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-brand-emerald" />}
              {isError && <AlertCircle className="w-4 h-4 text-brand-red" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {!isSuccess && !isError && !isWarning && (
                <Info className="w-4 h-4 text-brand-cyan" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {t.title && <div className="text-xs font-bold text-white">{t.title}</div>}
              {t.message && (
                <div className="text-[11px] text-brand-textSecondary mt-0.5 leading-relaxed">
                  {t.message}
                </div>
              )}
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg text-brand-textMuted hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
