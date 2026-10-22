import React from "react";
import { useToastStore } from "../store/toastStore";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: "border-l-green-500 bg-green-50 dark:bg-green-500/10",
  error: "border-l-red-500 bg-red-50 dark:bg-red-500/10",
  warning: "border-l-amber-500 bg-amber-50 dark:bg-amber-500/10",
  info: "border-l-blue-500 bg-blue-50 dark:bg-blue-500/10",
};

const iconColorMap = {
  success: "text-green-600 dark:text-green-400",
  error: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-blue-600 dark:text-blue-400",
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const Icon = iconMap[t.type] || Info;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto border-l-4 rounded-2xl px-4 py-3.5 shadow-xl flex items-start gap-3 animate-slide-down bg-brand-surface border border-brand-border ${colorMap[t.type] || colorMap.info}`}
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColorMap[t.type] || iconColorMap.info}`} />
            <div className="flex-1 min-w-0">
              {t.title && (
                <p className="text-sm font-bold text-brand-textPrimary">{t.title}</p>
              )}
              {t.message && (
                <p className="text-xs text-brand-textSecondary mt-0.5 leading-relaxed">{t.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-brand-textMuted hover:text-brand-textPrimary transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
