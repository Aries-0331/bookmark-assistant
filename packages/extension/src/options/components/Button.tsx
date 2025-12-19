import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonProps = {
  onClick?: () => void | Promise<void>;
  type?: 'button' | 'submit';
  isConnecting?: boolean;
  isSyncing?: boolean;
  disabled?: boolean;
  text?: string;
  loadingText?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'destructive';
  ariaLabel?: string;
  title?: string;
};

export default function Button({
  onClick,
  type = 'button',
  isConnecting = false,
  isSyncing = false,
  disabled = false,
  text = '',
  loadingText,
  icon,
  className = '',
  variant = 'primary',
  ariaLabel,
  title,
}: ButtonProps) {
  const isDisabled = disabled || isSyncing || isConnecting;

  const variantStyles = {
    primary: 'bg-gray-900 hover:bg-gray-700 focus-visible:ring-gray-900 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 focus-visible:ring-gray-500 text-gray-900',
    destructive: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-600 text-white',
  };

  const base =
    'h-12 rounded-xl transition-colors font-medium text-base inline-flex items-center justify-center p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isSyncing || isConnecting || undefined}
      aria-label={ariaLabel || text}
      className={`${className} ${base} ${variantStyles[variant]}`}
      title={title}
    >
      {isSyncing || isConnecting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
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
