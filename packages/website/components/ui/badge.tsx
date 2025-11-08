import * as React from "react";
import { cn } from "@/components/lib/cn";

type Variant = "primary" | "neutral" | "success" | "cta";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary: "bg-blue-50 text-blue-700 border border-blue-200",
  neutral: "bg-gray-100 text-gray-700 border border-gray-300",
  success: "bg-green-100 text-green-700",
  cta: "bg-gradient-to-r from-amber-500 to-amber-600 text-white",
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-normal",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
