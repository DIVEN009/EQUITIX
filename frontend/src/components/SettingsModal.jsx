import React, { useState } from "react";
import { X, Sun, Moon, DollarSign, Check } from "lucide-react";
import { useSettingsStore, SUPPORTED_CURRENCIES, THEME_CONFIGS } from "../store/settingsStore";

/**
 * Settings Modal — Theme Selector + Currency Preference.
 */
export const SettingsModal = ({ isOpen, onClose }) => {
  const { theme, setTheme, currency, setCurrency } = useSettingsStore();

  if (!isOpen) return null;

  const themes = [
    {
      ...THEME_CONFIGS.light,
      icon: Sun,
    },
    {
      ...THEME_CONFIGS.dark,
      icon: Moon,
    },
  ];

  const currencies = Object.values(SUPPORTED_CURRENCIES);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-brand-surface border border-brand-border rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-border">
          <h2 className="text-lg font-black text-brand-textPrimary">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-brand-card text-brand-textMuted hover:text-brand-textPrimary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
          {/* Theme Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider">
              Appearance
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((t) => {
                const isActive = theme === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer ${
                      isActive
                        ? "border-brand-emerald bg-brand-emerald/5 shadow-emeraldGlow"
                        : "border-brand-border hover:border-brand-borderHover bg-brand-card"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-emerald flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <Icon className={`w-6 h-6 mb-3 ${isActive ? "text-brand-emerald" : "text-brand-textMuted"}`} />
                    <p className="text-sm font-bold text-brand-textPrimary">{t.label}</p>
                    <p className="text-xs text-brand-textMuted mt-1 leading-relaxed">{t.description}</p>
                    {/* Color Swatches */}
                    <div className="flex gap-1.5 mt-3">
                      {Object.entries(t.colors).map(([key, color]) => (
                        <div
                          key={key}
                          className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: color }}
                          title={`${key}: ${color}`}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Currency Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5" />
              Display Currency
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {currencies.map((c) => {
                const isActive = currency === c.code;
                return (
                  <button
                    key={c.code}
                    onClick={() => setCurrency(c.code)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                      isActive
                        ? "border-brand-emerald bg-brand-emerald/5"
                        : "border-brand-border hover:border-brand-borderHover bg-brand-card"
                    }`}
                  >
                    <span className="text-xl">{c.flag}</span>
                    <div className="text-left">
                      <p className={`text-sm font-bold ${isActive ? "text-brand-emerald" : "text-brand-textPrimary"}`}>
                        {c.code}
                      </p>
                      <p className="text-[10px] text-brand-textMuted">{c.name}</p>
                    </div>
                    {isActive && (
                      <Check className="w-4 h-4 text-brand-emerald ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brand-border flex justify-end">
          <button
            onClick={onClose}
            className="btn-primary px-6 py-2.5 rounded-xl text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
