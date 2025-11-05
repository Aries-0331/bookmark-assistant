import { NotionBookmarkLogoBlue } from "@/components/icons/NotionBookmarkLogoBlue";

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-12 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <NotionBookmarkLogoBlue className="w-8 h-8" />
              <span className="text-base text-gray-900">Notion Bookmark Sync</span>
            </div>
            <p className="text-sm text-gray-600">Seamlessly sync your Chrome bookmarks to Notion.</p>
          </div>
          <div>
            <h4 className="text-base text-gray-900 mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a className="hover:text-gray-900" href="#features">Features</a></li>
              <li><a className="hover:text-gray-900" href="#pricing">Pricing</a></li>
              <li><a className="hover:text-gray-900" href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-base text-gray-900 mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a className="hover:text-gray-900" href="/docs">Documentation</a></li>
              <li><a className="hover:text-gray-900" href="/support">Support</a></li>
              <li><a className="hover:text-gray-900" href="https://github.com/Aries-0331/bookmarks_to_notion" target="_blank" rel="noreferrer">GitHub</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-base text-gray-900 mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a className="hover:text-gray-900" href="/privacy">Privacy Policy</a></li>
              <li><a className="hover:text-gray-900" href="/terms">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
          © 2025 Notion Bookmark Sync. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
