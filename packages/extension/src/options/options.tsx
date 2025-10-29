import { useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { PageHeader } from './components/SectionCard';
import { OverviewSection } from './components/OverviewSection';
import { ConnectionSection } from './components/ConnectionSection';
import { SyncSettingsSection } from './components/SyncSettingsSection';
import { AboutSection } from './components/AboutSection';
import { FAQSection, TutorialsSection } from './components/Placeholders';
import { BillingSection } from './components/BillingSection';
import { useHashRoute } from './router';
import { useToast } from './components/Toast';

export default function Options() {
  const { show } = useToast();
  const { route, navigate } = useHashRoute();

  const lastSyncRef = useRef<string | undefined>(undefined);

  // Listen to storage changes as an event-driven callback to reflect sync status
  useEffect(() => {
    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'local') return;
      const watched =
        'last_sync' in changes ||
        'last_sync_summary' in changes ||
        'sync_cooldown_until' in changes;
      if (!watched) return;

      // Toasts for summary and completion
      if ('last_sync_summary' in changes) {
        const summary = changes.last_sync_summary.newValue as string | null | undefined;
        if (summary === 'no_changes') {
          show({
            variant: 'success',
            title: 'Bookmarks are up to date',
            description: 'No changes detected.',
          });
        } else if (summary === 'cooldown') {
          show({
            variant: 'warning',
            title: 'Please try again later',
            description: 'Sync is in cooldown.',
          });
        } else if (summary === 'limit') {
          show({
            variant: 'error',
            title: 'Daily limit reached',
            description: "You have used up today's sync limit.",
          });
        } else if (summary === 'in_progress') {
          show({ variant: 'info', title: 'Sync in progress' });
        }
      }

      // When sync flag flips to false, show a completion toast if last_sync changed
      if ('sync_in_progress' in changes && changes.sync_in_progress.newValue === false) {
        const newLast = (changes.last_sync?.newValue as string | undefined) ?? lastSyncRef.current;
        if (newLast && newLast !== lastSyncRef.current) {
          show({ variant: 'success', title: 'Sync complete' });
        }
        lastSyncRef.current = newLast;
      }
      if ('last_sync' in changes) {
        const newLast = changes.last_sync.newValue as string | undefined;
        lastSyncRef.current = newLast;
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [show]);

  return (
    <div className="w-full min-h-screen flex flex-col">
      <PageHeader />
      <main className="flex-1 w-full bg-gray-50 flex flex-row justify-center items-start p-10 gap-6">
        <Sidebar active={route} onNavigate={navigate} />
        <section className="w-full space-y-6 max-w-3xl">
          {route === 'general' && (
            <>
              <OverviewSection />
              <ConnectionSection />
              <SyncSettingsSection />
            </>
          )}
          {route === 'billing' && <BillingSection />}
          {route === 'tutorials' && <TutorialsSection />}
          {route === 'faq' && <FAQSection />}
          {route === 'about' && <AboutSection />}
        </section>
      </main>
    </div>
  );
}
