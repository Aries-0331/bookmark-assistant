import './globals.css';

export const metadata = {
  title: 'Bookmark Assistant',
  description: 'AI assistant for managing bookmarks and syncing to Notion',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased text-gray-900 scroll-smooth bg-white">{children}</body>
    </html>
  );
}
