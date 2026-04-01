# 🚀 Quick Setup Guide - PW Mission Topper

## ✅ Loop Fixed! Now Setup API

### Step 1: Login to Admin Panel
1. Go to: https://pw-missiontopper.vercel.app/admin
2. Click "🔍 Google" button
3. Login with: `adityaghoghari01@gmail.com`
4. Admin panel will open

### Step 2: Configure API URL
1. In admin panel, find "🔌 API Configuration" section
2. Enter your API URL in the input box
3. Example: `https://your-api-server.com`
4. Click "Save API URL"
5. You'll see: "✅ API URL saved successfully!"

### Step 3: Test Batches
1. Go back to home page: https://pw-missiontopper.vercel.app
2. You should see 4 default batches:
   - Arjuna JEE 2027
   - Arjuna NEET 2027
   - UDAAN 2.0 2027
   - Udaan 2027
3. Click any batch
4. If API is configured correctly → Subjects will load
5. If not configured → "📭 Is batch mein koi subject nahi mila"

### Step 4: Add Custom Batches (Optional)
1. Go to admin panel
2. Scroll to "📚 Custom Batches" section
3. Click "+ Add Batch"
4. Fill in:
   - Batch ID (required)
   - Batch Name (required)
   - Thumbnail URL (optional)
   - Tag (e.g., JEE, NEET)
5. Click "Add Batch"

### Step 5: Edit Batches (Optional)
1. In admin panel, find any batch (default or custom)
2. Click "✏️ Edit" button
3. Change:
   - Batch Name
   - Thumbnail URL
   - Tag
4. Click "Save Changes"

## 🔧 Troubleshooting

### Problem: "📭 Is batch mein koi subject nahi mila"
**Solution**: API URL not configured or wrong
1. Go to admin panel
2. Check API URL is correct
3. Make sure API server is running
4. Test API manually: `https://your-api-url/api/pw/batchdetails`

### Problem: "😔 Sorry! Server is temporarily down"
**Solution**: API URL not set
1. Go to admin panel
2. Configure API URL
3. Save and refresh

### Problem: Loop on admin page
**Solution**: Already fixed! Just hard refresh (Ctrl+Shift+R)

### Problem: Can't login to admin
**Solution**: 
1. Use Google Sign-In (recommended)
2. Email: adityaghoghari01@gmail.com
3. If popup blocked, allow popups for the site

## 📝 API Endpoints Required

Your API server must have these endpoints:

1. `/api/pw/batches` - Get all batches
2. `/api/pw/batchdetails` - Get batch details & subjects
3. `/api/pw/topics` - Get topics for a subject
4. `/api/pw/datacontent` - Get content (videos/notes/DPP)
5. `/api/pw/videonew` - Get video URL
6. `/api/pw/otp` - Get DRM keys

## 🎯 Current Status

✅ Loop fixed  
✅ Admin panel working  
✅ Login working  
✅ Home page loading  
⚠️ Need to configure API URL  

## 📞 Next Steps

1. Configure API URL in admin panel
2. Test by clicking a batch
3. Subjects should load
4. Done! 🎉

---

**Website**: https://pw-missiontopper.vercel.app  
**Admin**: https://pw-missiontopper.vercel.app/admin  
**Email**: adityaghoghari01@gmail.com
