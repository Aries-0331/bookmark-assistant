import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  { q: "What's the difference between OAuth and OSS mode?", a: "OAuth connects your Notion securely via Notion's API. OSS mode lets you self-host or operate locally without third-party servers." },
  { q: "Is my data secure?", a: "We use OAuth and encrypted tokens. Only the minimum data needed to sync is transmitted." },
  { q: "Can I try Pro features before purchasing?", a: "You can start on Free and upgrade anytime. Trials may be offered periodically." },
  { q: "What happens to my bookmarks if I cancel Pro?", a: "Your existing Notion data remains. You can continue using the Free plan limits." },
  { q: "Can I sync existing bookmarks from Chrome?", a: "Yes, initial sync imports your current bookmarks and then keeps them updated." },
];

export function FAQ() {
  return (
    <section id="faq" className="py-20 bg-white">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <Badge className="mb-4" variant="neutral">FAQ</Badge>
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
