import { PageHeader } from './components/SectionCard';
import { OverviewSection } from './components/OverviewSection';
import { ConnectionSection } from './components/ConnectionSection';
import { SyncSettingsSection } from './components/SyncSettingsSection';
import { BillingSection } from './components/BillingSection';

export default function Options() {
  return (
    <div className="w-full min-h-screen flex flex-col bg-gray-50">
      <PageHeader />
      <main className="flex-1 w-full max-w-4xl mx-auto p-8 space-y-6">
        <OverviewSection onNavigate={() => {}} />
        <ConnectionSection />
        <SyncSettingsSection onNavigate={() => {}} />
        <BillingSection />
      </main>
    </div>
  );
}
