import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQS = [
  {
    q: 'How does auto-sync work?',
    a: 'Pro users can enable auto-sync to automatically sync bookmarks every 6 hours in the background. The extension monitors Chrome bookmarks and only syncs when changes are detected, saving time and resources.',
  },
  {
    q: 'Is my data secure?',
    a: 'We use OAuth and encrypted tokens. Only the minimum data needed to sync is transmitted. Your credentials never touch our servers - only secure OAuth flows are used.',
  },
  {
    q: 'How accurate is the description extraction?',
    a: 'Our server-side extraction achieves 90-92% accuracy for most websites. Some pages with dynamic content or no metadata may have lower accuracy. We cache descriptions for 30 days to improve consistency.',
  },
  {
    q: 'What happens to my bookmarks if I cancel Pro?',
    a: 'Your existing Notion data remains. You can continue using the Free plan limits (500 bookmarks per sync, manual sync only). Re-subscribe anytime to restore Pro features.',
  },
  {
    q: 'Can I sync existing bookmarks from Chrome?',
    a: 'Yes, initial sync imports your current bookmarks and then keeps them updated. The extension automatically creates the database structure in Notion - no manual setup required.',
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-20 bg-white">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <SectionEyebrow text="Support" color="purple" />
          <h2 className="text-4xl font-medium text-gray-900 mb-4">Frequently asked questions</h2>
        </div>
        <Accordion className="mt-8">
          {FAQS.map((f) => (
            <AccordionItem key={f.q}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
