import * as React from "react";

export function NotionBookmarkLogoBlue({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="40" height="40" rx="8" fill="#eff6ff" />
      <path d="M12 12h16v16H12z" fill="#2563eb" opacity="0.1" />
      <path d="M16 28V14h2.5l5.5 8.2V14H26v14h-2.5L18.5 19.8V28H16z" fill="#2563eb" />
    </svg>
  );
}
