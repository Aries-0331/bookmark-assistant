import { ExternalLink } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { formatLastUpdated } from '../utils';
import logoUrl from '../../assets/logo.png';

export function AboutSection({ version }: { version: string }) {
  const lastUpdated = formatLastUpdated();
  return (
    <SectionCard id="about" title="About" description="Information about Notion Bookmark Sync">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col items-center text-center">
          <img
            src={logoUrl}
            alt="Bookmark Assistant logo"
            className="w-14 h-14 rounded-xs border border-gray-200 object-cover mb-3"
          />
          <div className="text-lg font-semibold text-gray-900">Bookmark Assistant</div>
          <div className="text-xs text-gray-500">Version {version || '—'}</div>
          <div className="text-sm text-gray-600 mt-1">
            Sync your Chrome bookmarks to Notion seamlessly
          </div>
        </div>

        <hr className="my-5 border-gray-200" />

        <div className="grid grid-cols-1 grid-rows-2 gap-4 text-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-gray-600">License</span>
            <span className="text-gray-900 font-medium">MIT</span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-gray-600">Last Updated</span>
            <span className="text-gray-900 font-medium">{lastUpdated}</span>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <a
            href="https://github.com/Aries-0331/bookmarks_to_notion"
            target="_blank"
            rel="noreferrer"
            className="w-full inline-flex items-center gap-2 text-gray-800 hover:bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
            aria-label="View on GitHub"
          >
            <ExternalLink className="w-4 h-4" /> View on GitHub
          </a>
          <a
            href="https://github.com/Aries-0331/bookmarks_to_notion#readme"
            target="_blank"
            rel="noreferrer"
            className="w-full inline-flex items-center gap-2 text-gray-800 hover:bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
            aria-label="Documentation"
          >
            <ExternalLink className="w-4 h-4" /> Documentation
          </a>
          <a
            href="https://github.com/Aries-0331/bookmarks_to_notion/issues"
            target="_blank"
            rel="noreferrer"
            className="w-full inline-flex items-center gap-2 text-gray-800 hover:bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
            aria-label="Report an Issue"
          >
            <ExternalLink className="w-4 h-4" /> Report an Issue
          </a>
        </div>
      </div>

      <div className="mt-4">
        <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-700">
          Made with <span aria-hidden>❤️</span> for the Notion community
        </div>
      </div>
    </SectionCard>
  );
}
