# PW App - Quick Start Guide for Admin 🚀

## 🎯 Goal
Configure the PW app to use your API server and add custom batches.

## ⚡ Quick Setup (5 minutes)

### Step 1: Start the App
```bash
cd pw-app
npm install
npm run dev
```

App will run at: `http://localhost:3000`

### Step 2: Access Admin Panel
1. Open browser and go to: `http://localhost:3000/admin`
2. Enter password: `admin123`
3. Click "Login"

### Step 3: Configure API URL
1. In the "API Configuration" section
2. Enter your API base URL:
   ```
   https://apiserver-skpg.onrender.com
   ```
   (or your custom API server URL)
3. Click "Save API URL"
4. You'll see: "✅ API URL saved successfully!"

### Step 4: Add Custom Batches (Optional)
1. In the "Custom Batches" section
2. Click "+ Add Batch"
3. Fill in the form:
   - **Batch ID**: `your-batch-id` (e.g., `698ad3519549b300a5e1cc6a`)
   - **Batch Name**: `Your Batch Name` (e.g., `Arjuna JEE 2028`)
   - **Thumbnail URL**: `https://...` (optional)
   - **Tag**: `JEE` or `NEET` or `10th` (optional)
4. Click "Add Batch"
5. Your batch will appear on the home page!

### Step 5: Test
1. Go back to home page: `http://localhost:3000`
2. You should see:
   - ✅ "API Configured" badge
   - Your custom batches (if added)
   - Default batches
3. Click any batch to test if data loads

## 🔒 Security

### Change Admin Password (IMPORTANT!)
Before deploying to production, change the password:

1. Open `pw-app/pages/admin.js`
2. Find line 18:
   ```javascript
   const ADMIN_PASSWORD = 'admin123';
   ```
3. Change to your secure password:
   ```javascript
   const ADMIN_PASSWORD = 'your-super-secure-password-here';
   ```
4. Save the file

## 📋 Required API Endpoints

Your API server must have these endpoints:

```
✅ /api/pw/batches              - Get all batches
✅ /api/pw/batchdetails         - Get batch details
✅ /api/pw/topics               - Get topics
✅ /api/pw/datacontent          - Get content
✅ /api/pw/videonew             - Get video URL
✅ /api/pw/otp                  - Get DRM keys
✅ /api/pw/attachments-url      - Get PDF URLs
```

## 🎨 Custom Batch Example

Here's an example of adding a custom batch:

```
Batch ID: 698ad3519549b300a5e1cc6a
Batch Name: Arjuna JEE 2028
Thumbnail URL: https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/arjuna-jee-2027.png
Tag: JEE
```

This will create a beautiful batch card on the home page!

## 🐛 Troubleshooting

### "API not configured" error
- Go to `/admin`
- Set the API URL
- Make sure URL is valid (starts with `http://` or `https://`)

### Custom batch not showing
- Refresh the page
- Check if Batch ID is unique
- Check browser console for errors

### Videos not playing
- Verify API URL is correct
- Check if API server is running
- Test API endpoints manually

## 📱 How Users Will See It

### Before Configuration:
```
⚠️ API Not Configured
Please configure API URL in Admin Panel to fetch batch data.
```

### After Configuration:
```
✅ API Configured
[Your Custom Batches]
[Default Batches]
```

## 🚀 Deployment

### For Production:
1. Change admin password (see Security section)
2. Build the app:
   ```bash
   npm run build
   ```
3. Deploy to Vercel/Netlify/your hosting
4. Access `/admin` on production URL
5. Configure API URL
6. Add custom batches
7. Done!

## 💡 Tips

1. **Test Locally First**: Always test configuration locally before deploying
2. **Backup Batches**: Take note of custom batch IDs before clearing browser data
3. **Multiple Browsers**: Configuration is browser-specific (localStorage)
4. **API Health**: Make sure your API server is always running
5. **CORS**: API server should allow CORS from your domain

## 📞 Need Help?

Check these files:
- `ADMIN-SETUP.md` - Detailed setup guide
- `PW-APP-CONFIGURATION-COMPLETE.md` - Technical implementation details

## ✅ Checklist

- [ ] App running locally
- [ ] Admin panel accessible
- [ ] Admin password changed (for production)
- [ ] API URL configured
- [ ] API status shows "Configured"
- [ ] Custom batches added (if needed)
- [ ] Batches visible on home page
- [ ] Data loading correctly
- [ ] Videos playing
- [ ] PDFs opening
- [ ] Ready for deployment!

---

**That's it! Your PW app is now fully configured! 🎉**

For any issues, check the browser console and verify your API server is running.
