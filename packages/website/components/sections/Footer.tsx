import { Logo } from '../icons/Logo';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-12 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Logo className="w-8 h-8" />
              <span className="text-base text-gray-900">Bookmark Assistant</span>
            </div>
            <p className="text-sm text-gray-600">
              Seamlessly sync your Chrome bookmarks to Notion.
            </p>
          </div>
          <div>
            <h4 className="text-base text-gray-900 mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a className="hover:text-gray-900" href="#features">
                  Features
                </a>
              </li>
              <li>
                <a className="hover:text-gray-900" href="#pricing">
                  Pricing
                </a>
              </li>
              <li>
                <a className="hover:text-gray-900" href="#faq">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-base text-gray-900 mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a
                  className="hover:text-gray-900"
                  href="https://glow-pheasant-22f.notion.site/Bookmark-Assistant-Dashboard-2ce9466de76d80a49879d40f259ced08?pvs=143"
                  target="_blank"
                  rel="noreferrer"
                >
                  Notion Template
                </a>
              </li>
              <li>
                <a
                  className="hover:text-gray-900"
                  href="https://chromewebstore.google.com/detail/khffaaemphidjmhokafmiilkcjpgiije"
                  target="_blank"
                  rel="noreferrer"
                >
                  Chrome Web Store
                </a>
              </li>
              <li>
                <a className="hover:text-gray-900" href="mailto:aries0331.dev@gmail.com">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-base text-gray-900 mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a
                  className="hover:text-gray-900"
                  href="https://www.notion.so/bookmark-assistant/Privacy-Policy-2a24fd51dd3e806eb918cb2f37fefda7"
                  target="_blank"
                  rel="noreferrer"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  className="hover:text-gray-900"
                  href="https://www.notion.so/bookmark-assistant/Terms-of-Service-2a24fd51dd3e80258c2df46cab36d400"
                  target="_blank"
                  rel="noreferrer"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  className="hover:text-gray-900"
                  href="https://bookmark-assistant.notion.site/Refund-Policy-2a24fd51dd3e80ae9553e0ab34a55bd2"
                  target="_blank"
                  rel="noreferrer"
                >
                  Refund Policy
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
          <div>© 2025 Bookmark Assistant. Source code licensed under AGPL-3.0-or-later.</div>
          <div className="mt-2">
            The official hosted service and store listing are separate commercial offerings.
          </div>
        </div>
      </div>
    </footer>
  );
}
