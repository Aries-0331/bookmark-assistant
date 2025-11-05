"use client";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Crown, Sparkles, Check } from "lucide-react";

export function Pricing() {
  const [billing, setBilling] = React.useState<"monthly" | "yearly">("yearly");
  const proPrice = billing === "yearly" ? 7.2 : 9; // example numbers
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <Badge className="mb-4" variant="neutral">Pricing</Badge>
          <h2 className="text-4xl font-medium text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">Start free, upgrade when you need more power.</p>

          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-1 mb-12">
            <button
              className={`px-4 py-2 rounded-md text-base transition ${billing === "monthly" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"}`}
              onClick={() => setBilling("monthly")}
            >
              Monthly
            </button>
            <button
              className={`px-4 py-2 rounded-md text-base transition flex items-center gap-2 ${billing === "yearly" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"}`}
              onClick={() => setBilling("yearly")}
            >
              Yearly <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
          {/* Free */}
          <Card className="border-2">
            <CardBody className="p-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-gray-900 text-xl font-medium">Free</h3>
                  <p className="text-sm text-gray-600">For individuals</p>
                </div>
              </div>
              <div className="text-5xl text-gray-900 mb-6">$0 <span className="text-base text-gray-600">/month</span></div>
              <Button className="w-full mb-6" size="lg">Get Started Free</Button>
              <ul className="space-y-3">
                {["50 bookmarks per day", "Manual token authentication", "Basic sync features", "Community support", "Open source mode"].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                      <Check className="h-3 w-3 text-gray-600" />
                    </span>
                    <span className="text-base text-gray-700">{t}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {/* Pro */}
          <div className="relative">
            <Card className="border-2 border-blue-500">
              <CardBody className="p-8">
                <div className="absolute top-4 right-4">
                  <Badge variant="cta" className="px-2 py-1 text-xs">Most Popular</Badge>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center">
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 text-xl font-medium">Pro</h3>
                    <p className="text-sm text-gray-600">For power users</p>
                  </div>
                </div>
                <div className="text-5xl text-gray-900 mb-1">${proPrice} <span className="text-base text-gray-600">/month</span></div>
                {billing === "yearly" && (
                  <div className="text-sm text-gray-600 mb-5">Billed $86.40 yearly</div>
                )}
                <Button variant="pro" className="w-full mb-6" size="lg">
                  <Crown className="h-4 w-4 mr-2" /> Upgrade to Pro
                </Button>
                <ul className="space-y-3">
                  {["Unlimited bookmarks", "OAuth integration", "Auto-sync in background", "Priority support", "Advanced features", "Custom database mapping"].map((t) => (
                    <li key={t} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                        <Check className="h-3 w-3 text-amber-600" />
                      </span>
                      <span className="text-base text-gray-700">{t}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
