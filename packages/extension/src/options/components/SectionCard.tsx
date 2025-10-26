import { ReactNode } from 'react';
import logoUrl from '../../assets/logo.png';
import { Crown } from 'lucide-react';

export function SectionCard({
  id,
  title,
  description,
  advanced = false,
  isPro = false,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  advanced?: boolean;
  isPro?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 bg-white rounded-xl border border-gray-200 shadow-sm p-4"
    >
      <span className="flex items-center gap-2 mb-2">
        <h2 className="text-base font-medium text-gray-900">{title}</h2>
        {advanced && <Crown className={`w-4 h-4 ${isPro ? 'text-amber-500' : 'text-gray-500'}`} />}
      </span>
      {description ? <p className="text-sm text-gray-500 mb-3">{description}</p> : null}
      {children}
    </section>
  );
}

export function PageHeader() {
  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="w-full px-4 md:px-6 h-14 flex items-center justify-start gap-3">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="Bookmark Assistant logo"
            className="w-8 h-8 rounded-xs object-cover"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-gray-900">Bookmark Assistant</span>
            <span className="text-[11px] text-gray-500">Sync Bookmarks to Notion</span>
          </div>
        </div>
      </div>
    </header>
  );
}
