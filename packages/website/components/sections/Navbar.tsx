"use client";
import { Logo } from "@/components/icons/Logo";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function Navbar() {
  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-gray-200">
      <nav className="mx-auto max-w-7xl px-6 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo className="w-12 h-12" />
          <span className="text-base text-gray-900">Bookmark Assistant</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-gray-600">
          <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
          <a href="#how" className="hover:text-gray-900 transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
        </div>
        <div>
          <a href="#pricing" className="md:hidden text-sm underline">Get Extension</a>
          <div className="hidden md:block">
            <Button>
              <Globe className="h-4 w-4 mr-2" /> Get Chrome Extension
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
}
