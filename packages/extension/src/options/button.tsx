import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonProps = {
  onClick?: () => void | Promise<void>;
  type?: 'button' | 'submit';
  isLoading?: boolean;
  disabled?: boolean;
  text?: string;
  loadingText?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary';
  ariaLabel?: string;
  title?: string;
};

export default function Button({
  onClick,
  type = 'button',
  isLoading = false,
  disabled = false,
  text = '',
  loadingText,
  icon,
  className = '',
  ariaLabel,
  title,
}: ButtonProps) {
  const isDisabled = disabled || isLoading;
  const base =
    'h-12 rounded-xl transition-colors bg-gray-900 hover:bg-gray-700 font-medium text-base text-white inline-flex items-center justify-center p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      aria-label={ariaLabel || text}
      className={`${className} ${base}`}
      title={title}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {loadingText || 'Working…'}
        </>
      ) : (
        <>
          {icon}
          {text}
        </>
      )}
    </button>
  );
}
