import { ToastItem } from '../hook/useToast';

export function ToastView({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const { variant, title, description } = item;

  const styles = {
    success: {
      container: 'bg-green-50 border-green-200 text-green-800',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.79-1.79a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l3.91-5.59z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-4a1.25 1.25 0 100 2.5A1.25 1.25 0 0010 5z" />
        </svg>
      ),
    },
    warning: {
      container: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.721-1.36 3.486 0l6.518 11.59c.75 1.334-.213 3.01-1.743 3.01H3.482c-1.53 0-2.493-1.676-1.743-3.01l6.518-11.59zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-7a1 1 0 00-1 1v3a1 1 0 102 0V8a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    error: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.22 7.22a.75.75 0 011.06 0L10 7.94l.72-.72a.75.75 0 111.06 1.06L11.06 9l.72.72a.75.75 0 11-1.06 1.06L10 10.06l-.72.72a.75.75 0 11-1.06-1.06L8.94 9l-.72-.72a.75.75 0 010-1.06z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  } as const;

  const s = styles[variant];
  return (
    <div
      className={`w-full max-w-md rounded-xl border shadow-sm px-4 py-3 flex items-start gap-3 ${s.container}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <div className="mt-0.5 shrink-0">{s.icon}</div>
      <div className="flex-1">
        <div className="font-semibold text-sm">{title}</div>
        {description ? <div className="text-sm opacity-90">{description}</div> : null}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 rounded p-1 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2"
        aria-label="Close notification"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
