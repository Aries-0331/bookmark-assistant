import { SectionCard } from './SectionCard';

export function BillingSection() {
  return (
    <SectionCard
      id="billing"
      title="Billing & Plan"
      description="Manage your subscription and plan."
    >
      <div className="text-sm text-gray-600">This section is coming soon.</div>
    </SectionCard>
  );
}

export function NotificationsSection() {
  return (
    <SectionCard
      id="notifications"
      title="Notifications"
      description="Configure reminders and notifications."
    >
      <div className="text-sm text-gray-600">This section is coming soon.</div>
    </SectionCard>
  );
}

export function AdvancedSection() {
  return (
    <SectionCard id="advanced" title="Advanced" description="Advanced configuration.">
      <div className="text-sm text-gray-600">This section is coming soon.</div>
    </SectionCard>
  );
}

export function FAQSection() {
  return (
    <SectionCard id="faq" title="FAQ" description="Frequently asked questions.">
      <div className="text-sm text-gray-600">This section is coming soon.</div>
    </SectionCard>
  );
}

export function TutorialsSection() {
  return (
    <SectionCard id="tutorials" title="Tutorials" description="Step-by-step guides.">
      <div className="text-sm text-gray-600">This section is coming soon.</div>
    </SectionCard>
  );
}
