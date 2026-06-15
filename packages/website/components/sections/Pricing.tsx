import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { Card, CardBody } from '@/components/ui/card';
import { Check, Code2, Download, ExternalLink, Github, Sparkles, Zap } from 'lucide-react';

type Plan = {
  name: string;
  price: string;
  note: string;
  description: string;
  badge?: string;
  icon: typeof Code2;
  features: string[];
  cta: string;
  href: string;
  variant: 'open' | 'free' | 'pro';
};

const plans: Plan[] = [
  {
    name: 'Open Source',
    price: '$0',
    note: 'self-hosted',
    description: 'Run the extension and server with your own Notion integration and database.',
    icon: Github,
    variant: 'open',
    cta: 'View GitHub',
    href: 'https://github.com/Aries-0331/bookmark-assistant',
    features: [
      'Unlimited bookmarks',
      'Manual sync and current-page saves',
      'Chrome bookmarks and Reading List',
      'Your infrastructure, your data',
      'Community support',
    ],
  },
  {
    name: 'Official Free',
    price: '$0',
    note: 'Chrome Web Store',
    description: 'Use the official hosted service without running your own backend.',
    icon: Download,
    variant: 'free',
    cta: 'Add to Chrome',
    href: 'https://chromewebstore.google.com/detail/khffaaemphidjmhokafmiilkcjpgiije?utm_source=item-share-cb',
    features: [
      'Unlimited bookmarks',
      'Official hosted OAuth service',
      'One-click Notion setup',
      'Manual sync from popup',
      'No server maintenance',
    ],
  },
  {
    name: 'Official Pro',
    price: '$1.50',
    note: 'per month',
    description: 'Advanced convenience for people who want Bookmark Assistant to run quietly.',
    badge: 'Advanced',
    icon: Zap,
    variant: 'pro',
    cta: 'Upgrade in extension',
    href: 'https://chromewebstore.google.com/detail/khffaaemphidjmhokafmiilkcjpgiije?utm_source=item-share-cb',
    features: [
      'Automatic background sync',
      'Priority sync processing',
      'Smart fingerprint deduplication',
      'Shorter sync intervals',
      'Priority support',
    ],
  },
];

const variantClass = {
  open: {
    card: 'border-gray-200',
    icon: 'bg-gray-900 text-white',
    button: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50',
  },
  free: {
    card: 'border-gray-200',
    icon: 'bg-blue-50 text-blue-600',
    button: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50',
  },
  pro: {
    card: 'border-gray-900 ring-1 ring-gray-900',
    icon: 'bg-amber-50 text-amber-600',
    button: 'bg-gray-900 text-white hover:bg-gray-800',
  },
};

export function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <SectionEyebrow text="Open source + hosted Pro" color="amber" />
          <h2 className="text-4xl font-medium text-gray-900 mb-4">
            Choose how you want to run Bookmark Assistant
          </h2>
          <p className="text-lg text-gray-600">
            The core project is open source and self-hostable. The official extension adds a hosted
            service, and Pro unlocks managed convenience features.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-12 items-stretch">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const styles = variantClass[plan.variant];
            return (
              <Card
                key={plan.name}
                className={`relative h-full transition-shadow hover:shadow-lg ${styles.card}`}
              >
                <CardBody className="flex h-full flex-col p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`h-12 w-12 rounded-lg flex items-center justify-center ${styles.icon}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    {plan.badge && (
                      <div className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-2.5 py-1 text-xs font-medium text-white">
                        <Sparkles className="h-3 w-3" />
                        {plan.badge}
                      </div>
                    )}
                  </div>

                  <div className="mt-7">
                    <h3 className="text-xl font-medium text-gray-900">{plan.name}</h3>
                    <div className="mt-4 flex items-end gap-2">
                      <span className="text-4xl font-semibold text-gray-950">{plan.price}</span>
                      <span className="pb-1 text-sm text-gray-500">{plan.note}</span>
                    </div>
                    <p className="mt-4 text-base leading-7 text-gray-600">{plan.description}</p>
                  </div>

                  <ul className="mt-7 space-y-3 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm leading-6 text-gray-800">
                        <Check className="mt-1 h-4 w-4 flex-none text-green-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href={plan.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`mt-8 inline-flex h-12 w-full items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors ${styles.button}`}
                  >
                    {plan.cta}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </CardBody>
              </Card>
            );
          })}
        </div>

        <p className="mt-6 flex max-w-3xl gap-3 text-sm leading-6 text-gray-600">
          <Code2 className="mt-0.5 h-5 w-5 flex-none text-gray-900" />
          Bookmark count is unlimited across all options. Open source users run their own
          infrastructure; the official hosted extension offers managed setup and optional Pro
          automation.
        </p>
      </div>
    </section>
  );
}
