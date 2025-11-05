"use client";
import * as React from "react";
import { cn } from "@/components/lib/cn";

type Variant = "primary" | "secondary" | "pro" | "dark-cta";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

const base = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-gray-900 text-white hover:bg-gray-800",
  secondary: "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50",
  pro: "text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md hover:shadow-lg",
  "dark-cta": "bg-white text-gray-900 hover:bg-gray-100",
};

const sizes = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-3 text-base",
  lg: "px-8 py-6 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", fullWidth, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], fullWidth ? "w-full" : undefined, className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
