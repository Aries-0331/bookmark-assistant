import { Sidebar } from './components/Sidebar';
import { PageHeader } from './components/SectionCard';
import { OverviewSection } from './components/OverviewSection';
import { ConnectionSection } from './components/ConnectionSection';
import { SyncSettingsSection } from './components/SyncSettingsSection';
import { AboutSection } from './components/AboutSection';
import { FAQSection } from './components/Placeholders';
import { BillingSection } from './components/BillingSection';
import { useHashRoute } from './router';

export default function Options() {
  const { route, navigate } = useHashRoute();

  return (
    <div className="w-full min-h-screen flex flex-col">
      <PageHeader />
      <main className="flex-1 w-full bg-gray-50 flex flex-row justify-center items-start p-10 gap-6">
        <Sidebar active={route} onNavigate={navigate} />
        <section className="w-full space-y-6 max-w-3xl">
          {route === 'general' && (
            <>
              <OverviewSection onNavigate={navigate} />
              <ConnectionSection />
              <SyncSettingsSection onNavigate={navigate} />
            </>
          )}
          {route === 'billing' && <BillingSection />}
          {/* {route === 'tutorials' && <TutorialsSection />} */}
          {route === 'faq' && <FAQSection />}
          {route === 'about' && <AboutSection />}
        </section>
      </main>
    </div>
  );
}
