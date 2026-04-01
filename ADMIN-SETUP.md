# PW App - Admin Configuration Guide

## Overview
The PW app now uses a centralized API configuration system. All API requests use the admin-configured base URL, with no hardcoded URLs in the codebase.

## Features

### 1. Centralized API Configuration
- Admin can set the base API URL from the Admin Panel
- All API routes automatically use the configured URL
- Configuration stored in localStorage (browser-specific)
- Easy to switch between different API servers

### 2. Custom Batch Management
- Admin can add custom batches with:
  - Batch ID (required)
  - Batch Name (required)
  - Thumbnail URL (optional)
  - Tag (e.g., JEE, NEET, 10th)
- Custom batches appear on the home page alongside default batches
- Easy add/remove functionality

### 3. API Status Indicator
- Home page shows API configuration status
- Users can see if API is configured or not
- Link to Admin Panel for easy access

## Admin Panel Access

### URL
```
http://localhost:3000/admin
```

### Default Password
```
admin123
```

**⚠️ IMPORTANT:** Change the password in `pw-app/pages/admin.js` before deploying to production!

```javascript
// Line 18 in pw-app/pages/admin.js
const ADMIN_PASSWORD = 'your-secure-password-here';
```

## Configuration Steps

### Step 1: Access Admin Panel
1. Navigate to `/admin`
2. Enter the admin password
3. Click "Login"

### Step 2: Configure API URL
1. In the "API Configuration" section
2. Enter your API base URL (e.g., `https://apiserver-skpg.onrender.com`)
3. Click "Save API URL"
4. All users will now use this API URL

### Step 3: Add Custom Batches (Optional)
1. In the "Custom Batches" section
2. Click "+ Add Batch"
3. Fill in the form:
   - Batch ID: The unique batch identifier
   - Batch Name: Display name for the batch
   - Thumbnail URL: Image URL for the batch card
   - Tag: Category tag (JEE, NEET, etc.)
4. Click "Add Batch"

## Required API Endpoints

Your API server must support these endpoints:

```
/api/pw/batches              - Get all batches
/api/pw/batchdetails         - Get batch details (POST)
/api/pw/topics               - Get topics for a subject
/api/pw/datacontent          - Get content (videos, notes, DPP)
/api/pw/videonew             - Get video URL (primary)
/api/pw/video                - Get video URL (fallback 1)
/api/pw/videosuper           - Get video URL (fallback 2)
/api/pw/videoplay            - Get video URL (fallback 3)
/api/pw/otp                  - Get DRM keys
/api/pw/attachments-url      - Get PDF URLs (primary)
/api/pw/attachment-link      - Get PDF URLs (fallback)
```

## File Structure

```
pw-app/
├── lib/
│   ├── apiConfig.js         # API configuration service
│   └── decrypt.js           # Decryption utilities
├── pages/
│   ├── admin.js             # Admin panel page
│   ├── index.js             # Main app (updated)
│   └── api/
│       ├── batches.js       # Uses configured API URL
│       ├── batchdetails.js  # Uses configured API URL
│       ├── content.js       # Uses configured API URL
│       ├── topics.js        # Uses configured API URL
│       ├── videourl.js      # Uses configured API URL
│       ├── drm.js           # Uses configured API URL
│       ├── pdfurl.js        # Uses configured API URL
│       ├── pdfproxy.js      # CORS proxy (no changes)
│       └── stream.js        # Stream proxy (no changes)
└── ADMIN-SETUP.md           # This file
```

## How It Works

### API Configuration Flow
1. Admin sets API URL in Admin Panel
2. URL saved to localStorage (`pw_api_base_url`)
3. All API routes call `getApiUrl()` to get the configured URL
4. If URL not configured, API routes return 503 error
5. Frontend shows "API Not Configured" message

### Custom Batches Flow
1. Admin adds batch in Admin Panel
2. Batch saved to localStorage (`pw_custom_batches`)
3. Home page loads custom batches + default batches
4. Custom batches marked with `_custom: true` flag
5. Users can access custom batches like any other batch

## Security Notes

1. **Change Admin Password**: Update `ADMIN_PASSWORD` in `admin.js` before production
2. **localStorage**: Configuration is browser-specific. Each browser needs separate configuration.
3. **Future Enhancement**: Consider moving to Firebase for global configuration (like Science and Fun app)

## Troubleshooting

### "API not configured" error
- Access Admin Panel and set the API base URL
- Make sure the URL is valid and accessible
- Check browser console for errors

### Custom batches not showing
- Check localStorage in browser DevTools
- Look for `pw_custom_batches` key
- Verify batch data is valid JSON

### API requests failing
- Verify the configured API URL is correct
- Check if API server is running
- Look at Network tab in DevTools for error details
- Ensure all required endpoints are available

## Migration from Hardcoded URLs

All hardcoded URLs have been removed from:
- ✅ `pages/api/batches.js`
- ✅ `pages/api/batchdetails.js`
- ✅ `pages/api/content.js`
- ✅ `pages/api/topics.js`
- ✅ `pages/api/videourl.js`
- ✅ `pages/api/drm.js`
- ✅ `pages/api/pdfurl.js`

These files now use `getApiUrl()` from `lib/apiConfig.js`.

## Future Enhancements

1. **Firebase Integration**: Store configuration in Firebase for global access
2. **Multiple API Servers**: Support fallback API servers
3. **Batch Categories**: Organize batches by category
4. **Batch Search**: Add search functionality for batches
5. **User Permissions**: Different access levels for different users
