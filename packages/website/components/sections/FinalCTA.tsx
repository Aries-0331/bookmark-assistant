'use client';
import { Button } from '@/components/ui/button';
import { ArrowRight, Download } from 'lucide-react';

export function FinalCTA() {
  const openChromeStore = () => {
    window.open(
      'https://chromewebstore.google.com/detail/khffaaemphidjmhokafmiilkcjpgiije?utm_source=item-share-cb',
      '_blank'
    );
  };

  return (
    <>
      <section className="py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-center">
        <div className="mx-auto max-w-4xl px-6 text-white">
          <h2 className="text-4xl md:text-5xl font-medium mb-6">
            Ready to organize your bookmarks?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Install Bookmark Assistant from the Chrome Web Store and start syncing your bookmarks
            today.
          </p>
          <Button variant="dark-cta" size="lg" onClick={openChromeStore}>
            <Download className="h-5 w-5 mr-2" /> Add to Chrome{' '}
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </section>
    </>
  );
}
