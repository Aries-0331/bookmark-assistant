"use client";
import { Logo } from "@/components/icons/Logo";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function Navbar() {
  const openChromeStore = () => {
    window.open('https://chromewebstore.google.com/detail/khffaaemphidjmhokafmiilkcjpgiije?utm_source=item-share-cb', '_blank');
  };

  return (
    <>
    <div className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-gray-200">
      <nav className="mx-auto max-w-7xl px-6 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo className="w-12 h-12" />
          <span className="text-base text-gray-900">Bookmark Assistant</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-gray-600">
          <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
          <a href="#how" className="hover:text-gray-900 transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
        </div>
        <div>
            <button onClick={openChromeStore} className="md:hidden text-sm underline">Add to Chrome</button>
          <div className="hidden md:block">
              <Button onClick={openChromeStore}>
                <Download className="h-4 w-4 mr-2" /> Add to Chrome
            </Button>
          </div>
        </div>
      </nav>
    </div>
    </>
  );
}
