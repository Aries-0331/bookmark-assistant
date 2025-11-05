"use client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Chrome } from "lucide-react";

export function FinalCTA() {
  const onClick = () => window.open("https://chrome.google.com/webstore", "_blank");
  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-center">
      <div className="mx-auto max-w-4xl px-6 text-white">
        <h2 className="text-4xl md:text-5xl font-medium mb-6">Ready to organize your bookmarks?</h2>
        <p className="text-xl text-gray-300 mb-8">Join thousands of users building their knowledge base in Notion.</p>
        <Button variant="dark-cta" size="lg" onClick={onClick}>
          <Chrome className="h-5 w-5 mr-2" /> Get Chrome Extension <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </section>
  );
}
