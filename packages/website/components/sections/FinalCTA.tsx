"use client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bell } from "lucide-react";
import { useState } from "react";
import { WaitlistModal } from "@/components/WaitlistModal";

export function FinalCTA() {
  const [showWaitlist, setShowWaitlist] = useState(false);

  return (
    <>
    <section className="py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-center">
      <div className="mx-auto max-w-4xl px-6 text-white">
        <h2 className="text-4xl md:text-5xl font-medium mb-6">Ready to organize your bookmarks?</h2>
          <p className="text-xl text-gray-300 mb-4">Join the waitlist and be the first to try Bookmark Assistant.</p>
          <p className="text-sm text-gray-400 mb-8">🚀 Launching soon on Chrome Web Store</p>
          <Button variant="dark-cta" size="lg" onClick={() => setShowWaitlist(true)}>
            <Bell className="h-5 w-5 mr-2" /> Join Waitlist <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </section>

      <WaitlistModal isOpen={showWaitlist} onClose={() => setShowWaitlist(false)} />
    </>
  );
}
