# Database Setup Guide

## ⚠️ Important: Notion Database Setup Required

Before you can sync bookmarks, you need to set up a Notion database to store them.

### 🗃️ **Manual Database Setup (Recommended)**

1. **Create a new page in Notion** where you want your bookmarks
2. **Add a database** to that page with these properties:

| Property Name | Type | Description |
|---------------|------|-------------|
| `Title` | Title | Bookmark title |
| `URL` | URL | Bookmark URL |
| `Description` | Text | Page description or content summary |
| `Created` | Date | When bookmark was added |
| `BookmarkId` | Text | Internal ID |
| `Source` | Text | Always "Chrome Bookmarks" |

3. **Get the database ID**:
   - Share the database page and copy the URL
   - Extract the database ID from the URL: `https://notion.so/username/DATABASE_ID?v=...`
   - The database ID is the long string between the last `/` and `?v=`

4. **Store the database ID**:
   - Add this to your `.env.development` file:
   ```env
   VITE_NOTION_DATABASE_ID=your_database_id_here
   ```
   - Or configure it in the extension options page

### 🔧 **Automatic Database Creation (Future Feature)**

In a future update, the extension will be able to:
- Create databases automatically
- Let you select existing databases
- Set up the optimal database structure

For now, manual setup ensures you have full control over where your bookmarks are stored.

### 📋 **Database Template**

You can copy this template database:
[Bookmark Database Template](https://notion.so/templates) (link to be created)

### 🐛 **Troubleshooting**

**Error: "Database not configured"**
- Make sure you've created the database in Notion
- Verify the database ID is correct
- Ensure the database has the required properties

**Error: "Access denied"**
- Make sure your Notion integration has access to the database
- The integration needs to be added to the page containing the database
