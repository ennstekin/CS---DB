"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

interface Shortcut {
  key: string;
  description: string;
}

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: Shortcut[];
  title?: string;
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  shortcuts,
  title = "Klavye Kısayolları",
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <Kbd>{shortcut.key}</Kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          <Kbd>?</Kbd> tuşuna basarak bu pencereyi açabilirsiniz
        </p>
      </DialogContent>
    </Dialog>
  );
}
