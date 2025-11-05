export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <section className="text-center">
        <span className="inline-flex items-center rounded-full bg-brand-100 text-brand-800 px-3 py-1 text-xs font-semibold">
          New
          <span className="mx-1">•</span>
          AI-assisted syncing
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
          Bookmark Assistant
        </h1>
        <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
          Sync your bookmarks to Notion automatically. Fast, privacy-first, and effortless.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <a
            className="inline-flex items-center rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-black"
            href="https://github.com/yourusername/bookmark-notion-sync"
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub
          </a>
          <a
            className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            href="#"
          >
            Install Extension
          </a>
        </div>
      </section>

      <section className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[
          {
            title: 'One-click sync',
            body: 'Send new bookmarks to Notion in seconds with a clean mapping.',
          },
          {
            title: 'Smart dedupe',
            body: 'Avoid duplicates with fast URL and fingerprint checks.',
          },
          {
            title: 'Privacy-first',
            body: 'Only essential data is sent. You control what gets synced.',
          },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-gray-200 p-5 bg-white">
            <div className="text-lg font-semibold">{f.title}</div>
            <p className="mt-1 text-sm text-gray-600">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
