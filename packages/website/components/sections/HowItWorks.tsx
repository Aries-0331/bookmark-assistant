import { Card, CardBody } from "@/components/ui/card";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { Chrome, Lock, RefreshCw } from "lucide-react";

const STEPS = [
  { title: "Install the extension", desc: "Add Notion Bookmark Sync to Chrome.", icon: Chrome, color: "text-blue-600" },
  { title: "Connect to Notion", desc: "Securely authorize with OAuth.", icon: Lock, color: "text-green-600" },
  { title: "Sync bookmarks", desc: "One-click or automatic background sync.", icon: RefreshCw, color: "text-purple-600" },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <SectionEyebrow text="Quick Setup" color="green" />
          <h2 className="text-4xl font-medium text-gray-900 mb-4">Get started in 3 simple steps</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-16">Setting up takes less than 2 minutes.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((s, idx) => (
            <div key={s.title} className="relative">
              <Card className="border-2 hover:border-gray-300 transition-colors h-full">
                <CardBody className="p-8">
                  <div className="absolute -top-4 -left-4 w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-lg text-base font-medium">
                    {idx + 1}
                  </div>
                  <s.icon className={`h-8 w-8 ${s.color} mb-4`} />
                  <h3 className="text-xl text-gray-900 mb-2 font-medium">{s.title}</h3>
                  <p className="text-base text-gray-600">{s.desc}</p>
                </CardBody>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
