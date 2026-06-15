import { ReactNode } from 'react';
import logoUrl from '../../assets/logo.png';
import { Crown, Mail } from 'lucide-react';
import { RouteId } from '../router';
import { Card } from '../../components/ui/card';
import { createTranslator } from '../../utils/i18n';

export function SectionCard({
  id,
  title,
  description,
  advanced = false,
  isPro = false,
  onNavigate,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  advanced?: boolean;
  isPro?: boolean;
  onNavigate?: (to: RouteId) => void;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-24 p-4">
      <span className="flex items-center gap-2 mb-2">
        <h2 className="text-base font-medium text-foreground">{title}</h2>
        {advanced && (
          <Crown
            className={`w-4 h-4 cursor-pointer ${isPro ? 'text-amber-500' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={onNavigate ? () => onNavigate('general') : undefined}
          />
        )}
      </span>
      {description ? <p className="text-sm text-muted-foreground mb-3">{description}</p> : null}
      {children}
    </Card>
  );
}

export function PageHeader() {
  const { t } = createTranslator();
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'aries0331.dev@gmail.com';

  const handleSupportClick = () => {
    window.open(`mailto:${supportEmail}?subject=Bookmark Assistant Support`, '_blank');
  };

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="w-full px-4 md:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="Bookmark Assistant logo"
            className="w-8 h-8 rounded-xs object-cover"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-gray-900">{t('header_title')}</span>
            <span className="text-[11px] text-gray-500">{t('header_subtitle')}</span>
          </div>
        </div>

        <button
          onClick={handleSupportClick}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title={t('contact_support')}
        >
          <Mail className="w-4 h-4" />
          <span className="hidden sm:inline">{t('support')}</span>
        </button>
      </div>
    </header>
  );
}
