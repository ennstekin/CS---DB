import { useCallback } from "react";
import { toast as sonnerToast } from "sonner";

export interface Toast {
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
}

export function useToast() {
  const toast = useCallback(({ title, description, variant = "default" }: Toast) => {
    switch (variant) {
      case "destructive":
        sonnerToast.error(title, {
          description,
        });
        break;
      case "success":
        sonnerToast.success(title, {
          description,
        });
        break;
      default:
        sonnerToast(title, {
          description,
        });
    }
  }, []);

  return { toast };
}

// Direct toast functions for convenience
export const showToast = {
  success: (title: string, description?: string) => {
    sonnerToast.success(title, { description });
  },
  error: (title: string, description?: string) => {
    sonnerToast.error(title, { description });
  },
  info: (title: string, description?: string) => {
    sonnerToast.info(title, { description });
  },
  warning: (title: string, description?: string) => {
    sonnerToast.warning(title, { description });
  },
  loading: (title: string, description?: string) => {
    return sonnerToast.loading(title, { description });
  },
  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },
};
