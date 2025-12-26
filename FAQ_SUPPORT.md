# FAQ & Support Guide

> **Comprehensive FAQ for Bookmark Assistant - Chrome Web Store Launch**
> **Last Updated:** December 26, 2025
> **Support Email:** support@bookmark-assistant.com

---

## 🚀 Getting Started

### How do I install Bookmark Assistant?

1. Install from Chrome Web Store (search "Bookmark Assistant")
2. Click "Add to Chrome" and accept permissions
3. Click the extension icon in your toolbar
4. Click "Connect to Notion" to start OAuth setup
5. Grant access to your Notion workspace
6. Start syncing!

**No database setup required** - the extension creates the database structure automatically in Notion.

### What permissions does the extension need?

We request minimal permissions:

- **Bookmarks** - To read your Chrome bookmarks for syncing
- **Storage** - To save settings and sync status locally
- **Identity** - For secure OAuth authentication with Notion
- **Tabs** (optional) - To extract better descriptions from open pages

**We do NOT:**

- ❌ Track your browsing history
- ❌ Access other extensions' data
- ❌ Collect or sell your personal data
- ❌ Store bookmark content on our servers

### Do I need a Notion account?

Yes, you need a free Notion account to sync bookmarks. If you don't have one:

1. Sign up at https://notion.so (free forever)
2. Install Bookmark Assistant
3. Connect via OAuth during setup

---

## 🔄 Syncing & Features

### How does syncing work?

**Free Plan:**

- Manual sync only (click "Sync Now" button)
- Up to 50 bookmarks per sync
- Minimum 24-hour interval between syncs
- Smart change detection (only syncs when bookmarks change)

**Pro Plan ($2.99/mo or $29.99 lifetime):**

- Automatic background sync every 6 hours
- Unlimited bookmarks per sync
- Smart change detection + description caching
- Priority processing for faster syncs

### What gets synced to Notion?

For each bookmark, we sync:

- ✅ **Page Title** - Bookmark title from Chrome
- ✅ **URL** - Full bookmark link
- ✅ **Description** - Automatically extracted from page (90%+ accuracy)
- ✅ **Date Added** - When you bookmarked it
- ✅ **Folder Path** - Chrome folder organization
- ✅ **Sync ID** - Unique identifier for tracking changes

**Coming Q1 2025:** Favicon support for visual site icons

### How accurate is description extraction?

- **Client-side extraction:** 95% accuracy (when you've visited the page)
- **Server-side extraction:** 90-92% accuracy (automatic fallback)
- **Intelligent caching:** 30-day TTL, 80% cost reduction

The extension extracts descriptions from:

1. Meta description tags (priority 1)
2. Open Graph description (priority 2)
3. Page title (if descriptive)
4. Main content paragraphs (fallback)

### Does it change my Chrome bookmarks?

**No.** The extension is read-only for Chrome bookmarks. It only:

- ✅ Reads bookmark data
- ✅ Writes to your Notion database
- ❌ Never modifies Chrome bookmarks
- ❌ Never deletes Chrome bookmarks

### How often does auto-sync run?

**Free Plan:** No auto-sync (manual only)

**Pro Plan:**

- Default: Every 6 hours
- Configurable: 6-24 hour intervals
- Runs in background when Chrome is open
- Pauses when Chrome is closed, resumes on next launch

### What if I have duplicate bookmarks?

The extension uses **smart change detection**:

- First sync: Creates all bookmarks in Notion
- Subsequent syncs: Only syncs new/changed bookmarks
- Duplicates: Automatically skipped based on URL + Sync ID matching

---

## 💳 Billing & Plans

### What's the difference between Free and Pro?

| Feature                | Free        | Pro               |
| ---------------------- | ----------- | ----------------- |
| Manual Sync            | ✅ Yes      | ✅ Yes            |
| Auto-Sync              | ❌ No       | ✅ Every 6 hours  |
| Bookmarks/Sync         | 50          | Unlimited         |
| Sync Interval          | 24h minimum | 6h minimum        |
| Description Extraction | ✅ Yes      | ✅ Yes            |
| Smart Caching          | ✅ Yes      | ✅ Enhanced       |
| Priority Support       | ❌ No       | ✅ Yes            |
| Future AI Features     | ❌ No       | ✅ Free (Q3 2025) |

### How much does Pro cost?

- **Monthly:** $2.99/month (cancel anytime)
- **Lifetime:** $29.99 one-time (pay once, use forever)

💡 **Early Bird Pricing:** Lock in current prices before Q3 2025 when prices increase to $4.99/mo (Pro) and $49.99 (Lifetime)

### Can I try Pro before purchasing?

Currently, there's no trial period. However:

- Start with the generous **Free plan** (50 bookmarks/sync)
- Test all core features (manual sync, description extraction)
- Upgrade to Pro anytime for auto-sync and unlimited bookmarks
- 30-day money-back guarantee available

### Can I cancel Pro anytime?

**Yes!** Cancel anytime from:

1. Extension settings → "Billing & Plan"
2. Or email support@bookmark-assistant.com

**After cancellation:**

- ✅ Keep Pro access until current billing period ends
- ✅ All existing Notion data remains intact
- ✅ Downgrade to Free plan limits automatically
- ✅ Re-subscribe anytime without data loss

### What payment methods do you accept?

We use **Paddle** for secure payments, accepting:

- ✅ Credit/Debit cards (Visa, Mastercard, Amex, Discover)
- ✅ PayPal
- ✅ Apple Pay / Google Pay
- ✅ Bank transfers (some regions)

All payments are **PCI-DSS compliant** and secure.

### What happens to my bookmarks if I cancel Pro?

**Your data is safe:**

- ✅ All bookmarks remain in your Notion database
- ✅ No data is deleted from Notion
- ✅ You can continue manual syncing on Free plan
- ✅ Re-subscribe anytime to restore Pro features

---

## 🔒 Security & Privacy

### Is my data secure?

**Yes.** We take security seriously:

**OAuth Security:**

- ✅ Bank-grade OAuth 2.0 authentication
- ✅ Client secret never exposed to browser
- ✅ Secure server-side token exchange
- ✅ JWT tokens with expiration

**Data Privacy:**

- ✅ No bookmark content stored on our servers
- ✅ Only URLs and metadata are processed
- ✅ Description extraction is temporary (cached 30 days)
- ✅ No tracking or analytics on your bookmarks

**Network Security:**

- ✅ All traffic uses HTTPS/TLS encryption
- ✅ Minimal data transmission (only synced bookmarks)
- ✅ Connection pool optimization (no overload)

### Can I revoke access?

**Yes, anytime:**

**From Notion:**

1. Go to Settings & Members → My Connections
2. Find "Bookmark Assistant"
3. Click "Disconnect"

**From Extension:**

1. Open extension settings
2. Click "Disconnect from Notion"
3. Confirm disconnection

**Result:** Extension can no longer access your Notion workspace.

### Where is my data stored?

- **Chrome Bookmarks:** Stored locally by Chrome (we only read)
- **Extension Settings:** Stored in Chrome's local storage
- **Notion Data:** Stored in your Notion workspace (you control it)
- **Our Servers:** Only store:
  - User authentication tokens (encrypted)
  - Description cache (30-day TTL, no personal data)
  - Error logs (anonymized, no bookmark content)

**We do NOT store:**

- ❌ Bookmark content
- ❌ Personal information
- ❌ Browsing history
- ❌ Notion page contents

---

## 🛠️ Troubleshooting

### Why isn't my sync working?

**Common fixes:**

1. **Check Notion Connection:**
   - Go to extension settings
   - Verify "Connected to Notion" status
   - If disconnected, click "Connect to Notion"

2. **Check Permissions:**
   - Open Chrome → Extensions → Bookmark Assistant
   - Ensure all permissions are granted
   - Try removing and re-adding the extension

3. **Check Notion Access:**
   - In Notion, go to Settings & Members → My Connections
   - Verify "Bookmark Assistant" is connected
   - If not listed, reconnect via extension

4. **Check Plan Limits:**
   - Free: 50 bookmarks/sync, 24h interval
   - If exceeded, upgrade to Pro or wait 24 hours

5. **Check Chrome Version:**
   - Update Chrome to latest version
   - Extension requires Chrome 88+

### Why are descriptions missing?

**Possible reasons:**

1. **Page Not Visited:** Server-side extraction works, but visiting the page improves accuracy (95% vs 90%)
2. **Page Has No Meta Tags:** Some pages don't have description metadata
3. **Dynamic Content:** Some SPAs (single-page apps) load content dynamically
4. **Connection Issues:** Server couldn't fetch the page (timeout, firewall, etc.)

**Solutions:**

- Visit the page in Chrome before syncing (best accuracy)
- Manual descriptions: Edit in Notion after sync
- Pro users: Enhanced caching improves subsequent syncs

### Why do I get "Rate Limited" errors?

**Notion API has rate limits:**

- **Free:** 3 requests/second
- **Our batching:** Processes 5 bookmarks at a time
- **Delays:** Built-in 334ms delays between batches

**Solutions:**

- Wait a few minutes and try again
- Reduce bookmarks to sync (Free: 50 max)
- Pro users: Priority processing helps avoid limits

### Extension not appearing in toolbar?

**Fix:**

1. Right-click Chrome toolbar
2. Click "Extensions" → "Manage Extensions"
3. Find "Bookmark Assistant"
4. Click the pin icon to pin to toolbar

Or manually access via:

- Chrome menu (⋮) → Extensions → Bookmark Assistant

### Sync is slow or stuck?

**Normal behavior:**

- 50 bookmarks: ~30-60 seconds
- 500 bookmarks (Pro): ~5-10 minutes
- First sync is slower (generating descriptions)

**If genuinely stuck:**

1. Check console for errors (F12 → Console)
2. Close and reopen extension popup
3. Try manual "Sync Now" again
4. Contact support if persists

---

## 📱 Technical Questions

### Does it work with other browsers?

**Currently:** Chrome only (Chrome Web Store)

**Planned:**

- Q4 2025: Firefox extension
- Q4 2025: Safari extension
- 2026: Mobile apps (iOS/Android)

### Does it work offline?

**Partial support:**

- ✅ Extension settings work offline
- ✅ Local caching of sync status
- ❌ Syncing requires internet (Notion API)
- ❌ Description extraction requires internet

**When offline:**

- Sync is queued and runs when back online
- Pro auto-sync waits for connection

### Can I sync to multiple Notion workspaces?

**Current version:** One workspace per Chrome profile

**Workaround:**

- Use Chrome profiles for different Notion accounts
- Each profile has separate extension settings

**Planned (Q2 2025):** Multi-workspace support

### Does it sync Chrome folders?

**Current version:** Folder path is captured as text property in Notion

**Example:** `Bookmarks Bar / Work / Resources`

**Planned (Q2 2025):** Folder mapping (Chrome folders → separate Notion databases)

### Can I customize the Notion database structure?

**Current version:** Extension creates database with predefined properties:

- Title (title)
- URL (url)
- Description (text)
- Date Added (date)
- Folder Path (text)
- Sync ID (text)

**Planned (Q1 2025):** Custom field mapping

**Workaround:** Add custom properties in Notion after sync (won't be overwritten)

---

## 🎯 Future Features

### What's coming next?

**Q1 2025 (Next 3 months):**

- Favicon support (visual site icons in Notion)
- Multi-language support (English, 简体中文, 日本語)
- Progress indicators for long syncs
- Enhanced rate limiting

**Q2 2025:**

- Folder mapping (Chrome folders → Notion databases)
- Multi-database support (route bookmarks by rules)
- Bulk operations (edit/delete multiple bookmarks)
- Admin dashboard (cache monitoring)

**Q3 2025:**

- Pro+ tier ($9.99/mo)
- AI-powered tagging (credits-based)
- AI content summaries (credits-based)
- Duplicate detection

### Will Pro users get AI features for free?

**Yes!** Current Pro subscribers ($2.99/mo or $29.99 lifetime) will receive:

- ✅ Free access to AI tagging (Q3 2025)
- ✅ Free access to AI summaries (Q3 2025)
- ✅ Grandfathered pricing (lock in $2.99/mo)

**After Q3 2025:**

- New Pro: $4.99/mo (standard features)
- Pro+: $9.99/mo (includes AI features)

**Early bird advantage:** Subscribe now and get Pro+ features at Pro pricing!

---

## 📞 Support & Contact

### How do I get help?

**Support Channels:**

1. **Email Support** (All users)
   - Email: support@bookmark-assistant.com
   - Response time: Within 48 hours (Free), Within 24 hours (Pro)

2. **Documentation** (Self-service)
   - Browse FAQ above
   - Check Chrome Web Store listing
   - Review extension settings help text

3. **Bug Reports** (Critical issues)
   - Email: support@bookmark-assistant.com with:
     - Extension version (see settings)
     - Chrome version (chrome://version)
     - Error message or screenshot
     - Steps to reproduce

4. **Feature Requests**
   - Email: support@bookmark-assistant.com
   - Subject: "Feature Request: [Your Idea]"

### How fast will I get a response?

**Response Times:**

- **Free users:** Within 48 hours (business days)
- **Pro users:** Within 24 hours (priority support)
- **Critical bugs:** Within 24 hours (all users)

**Business Hours:** Monday-Friday, 9am-6pm EST

### Can I request a refund?

**Yes, 30-day money-back guarantee:**

**Eligible:**

- Subscriptions within 30 days of purchase
- Lifetime purchases within 30 days

**Process:**

1. Email: support@bookmark-assistant.com
2. Subject: "Refund Request"
3. Include: Order ID (from Paddle receipt)

**Processing:** 5-7 business days after approval

### Is there a community?

**Coming soon!**

**Planned:**

- Discord server (Q1 2025)
- Reddit community (Q1 2025)
- Twitter/X updates (@BookmarkAssist)

**Current:**

- Support email: support@bookmark-assistant.com
- Updates via Chrome Web Store reviews

---

## 🔗 Useful Links

### Official Links

- **Chrome Web Store:** [Coming soon]
- **Website:** https://bookmark-assistant.com
- **Support Email:** support@bookmark-assistant.com
- **Privacy Policy:** https://bookmark-assistant.com/privacy
- **Terms of Service:** https://bookmark-assistant.com/terms

### Documentation

- **User Guide:** [Notion page - coming soon]
- **Setup Guide:** [Notion page - coming soon]
- **Video Tutorial:** [YouTube - coming soon]

### Social Media (Planned Q1 2025)

- **Twitter/X:** @BookmarkAssist
- **Discord:** [Server invite]
- **Reddit:** r/BookmarkAssistant

---

## 💡 Tips & Best Practices

### Optimize sync performance

1. **Visit pages before syncing** - Better description accuracy (95% vs 90%)
2. **Sync during low-usage hours** - Faster processing
3. **Use Pro auto-sync** - Background processing, no manual work
4. **Keep Chrome updated** - Latest features and bug fixes

### Organize bookmarks in Notion

After sync, enhance your Notion database:

1. **Add custom properties** - Tags, categories, priorities
2. **Create database views** - Filter by folder, date, tags
3. **Use Notion relations** - Link to projects, notes
4. **Add manual descriptions** - Improve or customize auto-generated ones

### Backup your data

**Notion has built-in backups**, but you can also:

1. Export Notion database as CSV (File → Export)
2. Chrome bookmarks export (Bookmarks Manager → ⋮ → Export)
3. Regular syncs maintain consistency between Chrome and Notion

---

**Still have questions?**
📧 Email us at **support@bookmark-assistant.com**

We typically respond within 24-48 hours!

---

**Last Updated:** December 26, 2025
**Version:** 1.0.0 (Production Launch)
**Support Email:** support@bookmark-assistant.com
