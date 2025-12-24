import { PageHeader } from './components/SectionCard';
import { OverviewSection } from './components/OverviewSection';
import { ConnectionSection } from './components/ConnectionSection';
import { SyncSettingsSection } from './components/SyncSettingsSection';
import { BillingSection } from './components/BillingSection';
import { ErrorLog } from './ErrorLog';

export default function Options() {
  return (
    <div className="w-full min-h-screen flex flex-col bg-gray-50">
      <PageHeader />
      <main className="flex-1 w-full max-w-3xl mx-auto p-8 space-y-6">
        <OverviewSection onNavigate={() => {}} />
        <ConnectionSection />
        <SyncSettingsSection onNavigate={() => {}} />
        <BillingSection />
        
        {/* Error Log Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Error Log</h2>
          <ErrorLog />
        </div>
      </main>
    </div>
  );
}
