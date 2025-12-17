import { useState, useCallback } from "react";

export interface Toast {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const [, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, variant = "default" }: Toast) => {
    // Simple console log for now, can be replaced with a proper toast library
    if (variant === "destructive") {
      console.error(`[Toast Error] ${title}: ${description}`);
      alert(`Error: ${title}\n${description || ""}`);
    } else {
      console.log(`[Toast] ${title}: ${description}`);
      alert(`${title}\n${description || ""}`);
    }

    setToasts((prev) => [...prev, { title, description, variant }]);
  }, []);

  return { toast };
}
