"use client";

/**
 * Continuous Tabs — adapted from Watermelon UI (https://ui.watermelon.sh, MIT License,
 * © Watermelon Platform Contributors). Changes: controlled value, per-instance layoutId,
 * compact size, theme tokens instead of hard-coded shadows, server-renderable.
 */
import { LayoutGroup, motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface ContinuousTabItem {
  id: string;
  label: ReactNode;
}

interface ContinuousTabsProps {
  tabs: ContinuousTabItem[];
  value: string;
  onValueChange?: (id: string) => void;
  /** Unique per instance so pills on the same page animate independently. */
  layoutId: string;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function ContinuousTabs({
  tabs,
  value,
  onValueChange,
  layoutId,
  size = "md",
  disabled,
  className,
  ariaLabel,
}: ContinuousTabsProps) {
  return (
    <LayoutGroup id={layoutId}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          "relative inline-flex items-center gap-0.5 rounded-xl border bg-background p-1 shadow-sm",
          disabled && "pointer-events-none opacity-60",
          className,
        )}
      >
        {tabs.map((tab) => {
          const isActive = value === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => !isActive && onValueChange?.(tab.id)}
              className={cn(
                "relative rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
                size === "sm" ? "px-3 py-1.5" : "px-5 py-2.5",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={`${layoutId}-pill`}
                  transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.9 }}
                  className="absolute inset-0 rounded-lg bg-foreground shadow-xs"
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex items-center gap-1.5 font-semibold transition-colors duration-200",
                  size === "sm" ? "text-xs" : "text-sm",
                  isActive ? "text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
