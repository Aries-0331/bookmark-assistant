import { PageHeader } from './components/SectionCard';
import { OverviewSection } from './components/OverviewSection';
import { ConnectionSection } from './components/ConnectionSection';
import { SyncSettingsSection } from './components/SyncSettingsSection';
import { BillingSection } from './components/BillingSection';
import { Mail, FileText, Github } from 'lucide-react';

export default function Options() {
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'aries0331.dev@gmail.com';
  const faqUrl = import.meta.env.VITE_FAQ_URL || 'https://bookmark-assistant.vercel.app/#faq';
  const privacyUrl = import.meta.env.VITE_PRIVACY_URL || 'https://bookmark-assistant.notion.site/Privacy-Policy-2a24fd51dd3e806eb918cb2f37fefda7';
  const termsUrl = import.meta.env.VITE_TERMS_URL || 'https://www.notion.so/bookmark-assistant/Terms-of-Service-2a24fd51dd3e80258c2df46cab36d400';

  const handleSupportClick = () => {
    window.open(`mailto:${supportEmail}?subject=Bookmark Assistant Support`, '_blank');
  };

  const handleFAQClick = () => {
    window.open(faqUrl, '_blank');
  };

  const getVersion = () => {
    const manifest = chrome.runtime.getManifest();
    return manifest?.version || '1.0.0';
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-gray-50">
      <PageHeader />
      <main className="flex-1 w-full max-w-3xl mx-auto p-8 space-y-6">
        <OverviewSection onNavigate={() => {}} />
        <ConnectionSection />
        <SyncSettingsSection onNavigate={() => {}} />
        <BillingSection />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-gray-200 bg-white/50 backdrop-blur">
        <div className="max-w-3xl mx-auto p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <button
              onClick={handleSupportClick}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="p-2 bg-blue-50 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Need Help?</div>
                <div className="text-xs text-gray-500">Contact Support</div>
              </div>
            </button>

            <button
              onClick={handleFAQClick}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="p-2 bg-green-50 rounded-lg">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">FAQ & Guide</div>
                <div className="text-xs text-gray-500">Common Questions</div>
              </div>
            </button>

            <div className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Github className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Version</div>
                <div className="text-xs text-gray-500">{getVersion()}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              © 2025 Bookmark Assistant. Transform your bookmarks into organized knowledge.
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <button
                onClick={() => window.open(privacyUrl, '_blank')}
                className="hover:text-gray-700 transition-colors"
              >
                Privacy
              </button>
              <span className="text-gray-300">•</span>
              <button
                onClick={() => window.open(termsUrl, '_blank')}
                className="hover:text-gray-700 transition-colors"
              >
                Terms
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
