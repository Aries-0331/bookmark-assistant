'use client';
import { Button } from '@/components/ui/button';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { ArrowRight, Download } from 'lucide-react';
import { motion } from 'framer-motion';

const HERO_IMG = '/assets/marquee-promo-tile.png';
const NOTION_TEMPLATE_URL =
  'https://glow-pheasant-22f.notion.site/Bookmark-Assistant-Dashboard-2ce9466de76d80a49879d40f259ced08?pvs=143';

const ProductHuntBadge = () => (
  <a
    href="https://www.producthunt.com/products/bookmark-assistant?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-bookmark-assistant"
    target="_blank"
    rel="noopener noreferrer"
    className="block hover:opacity-85 transition-opacity"
  >
    <img
      alt="Bookmark Assistant - Sync Chrome bookmarks to Notion with rich metadata. | Product Hunt"
      width="250"
      height="54"
      src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1055606&theme=light"
    />
  </a>
);

export function Hero() {
  const openChromeStore = () => {
    window.open('https://chromewebstore.google.com/detail/khffaaemphidjmhokafmiilkcjpgiije?utm_source=item-share-cb', '_blank');
  };

  const openTemplate = () => {
    window.open(NOTION_TEMPLATE_URL, '_blank');
  };

  return (
    <>
      <section className="pt-20 pb-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 pt-6">
          {/* Title and Description - centered */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <h1 className="text-5xl md:text-6xl font-medium leading-tight text-gray-900 mb-5">
              Sync Chrome bookmarks to{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Notion
              </span>
            </h1>
            <p className="text-xl text-gray-600 mx-auto">
              One-click setup, rich metadata, auto-sync. Your knowledge base, always current.
            </p>
          </motion.div>

          {/* CTA Buttons with Product Hunt Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-10"
          >
            <Button onClick={openChromeStore} size="lg">
              <Download className="h-5 w-5 mr-2" /> Add to Chrome{' '}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <div className="flex items-center gap-4">
              <Button variant="secondary" size="lg" onClick={openTemplate}>
                Get Notion Template
              </Button>
              <ProductHuntBadge />
            </div>
          </motion.div>

          {/* Trust indicators - simple text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-8 text-sm text-gray-500 mb-16"
          >
            <span className="flex items-center">🔒 OAuth Secure</span>
            <span className="flex items-center">💰 Free Tier Available</span>
            <span className="flex items-center">⚡ Auto Sync</span>
          </motion.div>

          {/* Main Image - clean, no floating cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="rounded-2xl shadow-xl overflow-hidden"
          >
            <ImageWithFallback src={HERO_IMG} alt="Notion Dashboard" className="w-full h-auto" />
          </motion.div>
        </div>
      </section>
    </>
  );
}
