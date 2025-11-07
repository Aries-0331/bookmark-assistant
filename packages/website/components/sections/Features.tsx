import { Card, CardBody } from "@/components/ui/card";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { Zap, BookmarkPlus, RefreshCw, Shield, Code, Cloud } from "lucide-react";

const FEATURES = [
  {
    title: "One-Click Sync",
    desc: "Send new bookmarks to Notion in seconds with clean mapping.",
    icon: Zap,
    bg: "from-blue-50 to-indigo-50",
    iconColor: "text-blue-600",
  },
  {
    title: "Rich Metadata",
    desc: "Capture titles, descriptions, favicons, and more.",
    icon: BookmarkPlus,
    bg: "from-purple-50 to-pink-50",
    iconColor: "text-purple-600",
  },
  {
    title: "Auto Sync",
    desc: "Keep Notion up-to-date automatically in the background.",
    icon: RefreshCw,
    bg: "from-green-50 to-emerald-50",
    iconColor: "text-green-600",
  },
  {
    title: "Secure OAuth",
    desc: "Connect safely with encrypted tokens and scopes.",
    icon: Shield,
    bg: "from-amber-50 to-orange-50",
    iconColor: "text-amber-600",
  },
  {
    title: "OSS Mode",
    desc: "Self-host or use local-only sync with transparency.",
    icon: Code,
    bg: "from-cyan-50 to-blue-50",
    iconColor: "text-cyan-600",
  },
  {
    title: "Folder Sync",
    desc: "Map Chrome folders to Notion databases.",
    icon: Cloud,
    bg: "from-indigo-50 to-violet-50",
    iconColor: "text-indigo-600",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <SectionEyebrow text="What You Get" color="blue" />
          <h2 className="text-4xl font-medium text-gray-900 mb-4">Everything you need to organize</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-16">
            Powerful, practical features that fit your workflow without getting in the way.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="hover:shadow-lg transition-shadow h-full">
              <CardBody>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${f.bg} mb-4 flex items-center justify-center`}>
                  <f.icon className={`h-6 w-6 ${f.iconColor}`} />
                </div>
                <h3 className="text-xl text-gray-900 mb-2 font-medium">{f.title}</h3>
                <p className="text-base text-gray-600">{f.desc}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
