import { LayoutGrid, Info, CircleDollarSign, HelpCircle, BookOpen } from 'lucide-react';
import { RouteId } from '../router';

type Item = { id: RouteId; label: string; icon: JSX.Element };

const items: Item[] = [
  { id: 'general', label: 'General', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'billing', label: 'Billing & Plan', icon: <CircleDollarSign className="w-4 h-4" /> },
  { id: 'tutorials', label: 'Tutorials', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'faq', label: 'FAQ', icon: <HelpCircle className="w-4 h-4" /> },
  { id: 'about', label: 'About', icon: <Info className="w-4 h-4" /> },
];

export function Sidebar({
  active,
  onNavigate,
}: {
  active: RouteId;
  onNavigate: (to: RouteId) => void;
}) {
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
              <span className="text-base">{i.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
