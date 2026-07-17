"use client";

import { X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { setBreakingNewsOpen, type RootState } from "@/store/store";

export function BreakingNews() {
  const dispatch = useDispatch();
  const isOpen = useSelector((state: RootState) => state.ui.breakingNewsOpen);

  if (!isOpen) return null;

  return (
    <div className="border-b bg-primary text-primary-foreground">
      <div className="container flex min-h-10 items-center justify-between gap-3 py-2 text-sm">
        <p className="font-semibold">
          Breaking: Live editorial desk is tracking top stories across politics, business, technology, and sport.
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-white/10"
          aria-label="Dismiss breaking news"
          onClick={() => dispatch(setBreakingNewsOpen(false))}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
