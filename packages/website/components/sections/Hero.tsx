"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { Chrome, ArrowRight, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const HERO_IMG = "https://images.unsplash.com/photo-1549930585-0e530dd1afd4?auto=format&fit=crop&w=1200&q=80";

export function Hero() {
  const handleGetStarted = () => {
    window.open("https://chrome.google.com/webstore", "_blank");
  };
  const handleLearnMore = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <section className="pt-32 pb-20 bg-white">
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Badge variant="primary" className="mb-4">
            <Sparkles className="h-3.5 w-3.5" /> New AI Tagging
          </Badge>
          <h1 className="text-5xl md:text-6xl font-medium leading-tight text-gray-900 mb-6">
            Sync your Chrome bookmarks to <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Notion</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl">
            One-click setup, rich metadata, and optional auto-sync. Keep your Notion knowledge base always up-to-date.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleGetStarted} size="lg">
              <Chrome className="h-5 w-5 mr-2" /> Get Chrome Extension <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="secondary" size="lg" onClick={handleLearnMore}>Learn more</Button>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-gray-600">
            <span className="inline-flex items-center"><CheckCircle2 className="h-4 w-4 text-green-600 mr-2" /> OAuth secure</span>
            <span className="inline-flex items-center"><CheckCircle2 className="h-4 w-4 text-green-600 mr-2" /> Open source mode</span>
            <span className="inline-flex items-center"><CheckCircle2 className="h-4 w-4 text-green-600 mr-2" /> Cancel anytime</span>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="rounded-2xl shadow-2xl border border-gray-200 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/20 to-transparent pointer-events-none" />
            <ImageWithFallback src={HERO_IMG} alt="Notion Dashboard" className="w-full h-auto" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-gray-200 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <RefreshCw className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Synced today</div>
              <div className="text-base text-gray-900 font-medium">1,247 bookmarks</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
