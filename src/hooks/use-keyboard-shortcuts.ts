"use client";

import { useEffect, useCallback } from "react";

interface ShortcutConfig {
  key: string;
  callback: () => void;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], enabled: boolean = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore shortcuts when typing in input/textarea
      const target = event.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" ||
                      target.tagName === "TEXTAREA" ||
                      target.isContentEditable;

      for (const shortcut of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const matchesMeta = shortcut.metaKey ? event.metaKey : !event.metaKey;
        const matchesShift = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const matchesAlt = shortcut.altKey ? event.altKey : !event.altKey;

        // Allow some shortcuts even when typing (like Escape)
        const allowWhileTyping = shortcut.key === "Escape";

        if (matchesKey && matchesCtrl && matchesMeta && matchesShift && matchesAlt) {
          if (isTyping && !allowWhileTyping && !shortcut.ctrlKey && !shortcut.metaKey) {
            continue;
          }
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.callback();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export const KEYBOARD_SHORTCUTS = {
  mails: [
    { key: "j", description: "Sonraki konuşma" },
    { key: "k", description: "Önceki konuşma" },
    { key: "r", description: "Cevap yaz" },
    { key: "a", description: "AI cevap oluştur" },
    { key: "/", description: "Arama" },
    { key: "Escape", description: "Seçimi kaldır / Kapat" },
    { key: "?", description: "Kısayolları göster" },
  ],
  tickets: [
    { key: "j", description: "Sonraki talep" },
    { key: "k", description: "Önceki talep" },
    { key: "n", description: "Yeni talep" },
    { key: "/", description: "Arama" },
    { key: "Escape", description: "Seçimi kaldır" },
    { key: "?", description: "Kısayolları göster" },
  ],
};
