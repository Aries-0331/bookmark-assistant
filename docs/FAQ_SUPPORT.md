# FAQ & Support Guide

> **Comprehensive FAQ for Bookmark Assistant - Chrome Web Store Launch**
> **Last Updated:** December 26, 2025
> **Support Email:** aries0331.dev@gmail.com

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

We request **minimal permissions** for security and privacy:

**Required Permissions:**

- ✅ **Bookmarks** - Read your Chrome bookmarks for syncing (read-only)
- ✅ **Storage** - Save settings and sync status locally
- ✅ **Identity** - Secure OAuth 2.0 authentication with Notion
- ✅ **Notifications** - Notify you when sync completes
- ✅ **Alarms** - Schedule auto-sync (Pro feature only)

**Host Permissions (Specific Sites Only):**

- ✅ `https://api.notion.com/*` - Communicate with Notion API
- ✅ `https://*.vercel.app/*` - Our backend server for OAuth and description extraction

**We do NOT request:**

- ❌ `<all_urls>` (broad access to all websites)
- ❌ `activeTab` (access to current tab)
- ❌ `tabs` (tab information)
- ❌ `history` (browsing history)
- ❌ `webNavigation` (navigation tracking)

**We do NOT:**

- ❌ Track your browsing history
- ❌ Access other extensions' data
- ❌ Inject scripts into websites
- ❌ Collect or sell your personal data
- ❌ Store bookmark content on our servers

---

## 🔄 Syncing & Features

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

### Can I try Pro before purchasing?

Currently, there's no trial period. However:

- Start with the generous **Free plan** (50 bookmarks/sync)
- Test all core features (manual sync, description extraction)
- Upgrade to Pro anytime for auto-sync and unlimited bookmarks
- 14-day money-back guarantee available

### Can I cancel Pro anytime?

**Yes!** Cancel anytime from:

1. Extension settings → "Billing & Plan"
2. Or email aries0331.dev@gmail.com

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

**Description extraction is done entirely server-side** for better privacy (90-92% accuracy).

**Possible reasons:**

1. **Page Has No Meta Tags:** Some pages don't have description metadata
2. **Dynamic Content:** Some SPAs (single-page apps) load content dynamically (JavaScript-rendered)
3. **Connection Issues:** Server couldn't fetch the page (timeout, firewall, blocked by robots.txt)
4. **Private/Protected Pages:** Pages behind login or paywall can't be accessed
5. **First Sync:** Descriptions are generated on-demand and cached for 30 days

**Solutions:**

- Wait and sync again: Cached descriptions improve over time
- Manual descriptions: Edit directly in Notion after sync
- Pro users: Enhanced caching and priority processing
- Most common sites (Wikipedia, Medium, GitHub, etc.) extract perfectly

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

### Can I customize the Notion database structure?

**Current version:** Extension creates database with predefined properties:

- Title (title)
- URL (url)
- Description (text)
- Date Added (date)
- Folder Path (text)
- Sync ID (text)

**Workaround:** Add custom properties in Notion after sync (won't be overwritten)

---

## 📞 Support & Contact

### How do I get help?

**Support Channels:**

1. **Email Support** (All users)
   - Email: aries0331.dev@gmail.com
   - Response time: Within 48 hours (Free), Within 24 hours (Pro)

2. **Documentation** (Self-service)
   - Browse FAQ above
   - Check Chrome Web Store listing
   - Review extension settings help text

3. **Bug Reports** (Critical issues)
   - Email: aries0331.dev@gmail.com with:
     - Extension version (see settings)
     - Chrome version (chrome://version)
     - Error message or screenshot
     - Steps to reproduce

4. **Feature Requests**
   - Email: aries0331.dev@gmail.com
   - Subject: "Feature Request: [Your Idea]"

### Can I request a refund?

**Yes, 14-day money-back guarantee:**

**Eligible:**

- Subscriptions within 14 days of purchase
- Lifetime purchases within 14 days

**Process:**

1. Email: aries0331.dev@gmail.com
2. Subject: "Refund Request"
3. Include: Order ID (from Paddle receipt)

**Processing:** 5-7 business days after approval

---

## 🔗 Useful Links

### Official Links

- **Chrome Web Store:** [Coming soon]
- **Website:** https://bookmark-assistant.com
- **Support Email:** aries0331.dev@gmail.com
- **Privacy Policy:** https://bookmark-assistant.com/privacy
- **Terms of Service:** https://bookmark-assistant.com/terms

---

### Backup your data

**Notion has built-in backups**, but you can also:

1. Export Notion database as CSV (File → Export)
2. Chrome bookmarks export (Bookmarks Manager → ⋮ → Export)
3. Regular syncs maintain consistency between Chrome and Notion

---

**Still have questions?**
📧 Email us at **aries0331.dev@gmail.com**

We typically respond within 24-48 hours!

---

**Last Updated:** December 26, 2025
**Version:** 1.0.0 (Production Launch)
**Support Email:** aries0331.dev@gmail.com
