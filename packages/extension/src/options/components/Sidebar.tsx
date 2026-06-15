import { LayoutGrid, Info, HelpCircle } from 'lucide-react';
import { RouteId } from '../router';
import { createTranslator } from '../../utils/i18n';

type Item = { id: RouteId; labelKey: string; icon: JSX.Element };

export function Sidebar({
  active,
  onNavigate,
}: {
  active: RouteId;
  onNavigate: (to: RouteId) => void;
}) {
  const { t } = createTranslator();

  const items: Item[] = [
    { id: 'general', labelKey: 'nav_general', icon: <LayoutGrid className="w-4 h-4" /> },
    // { id: 'tutorials', label: 'Tutorials', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'faq', labelKey: 'nav_faq', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'about', labelKey: 'nav_about', icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <nav
      className="hidden md:block w-64 pr-6 sticky top-16 self-start max-h-[calc(100vh-4rem)] overflow-auto"
      aria-label="Settings sections"
    >
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.id}>
            <button
              onClick={() => onNavigate(i.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors ${
                active === i.id ? 'bg-gray-900 text-white' : 'text-gray-800 hover:bg-gray-100'
              }`}
              aria-current={active === i.id ? 'page' : undefined}
            >
              {i.icon}
              <span className="text-base">{t(i.labelKey)}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
