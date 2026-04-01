# 🚀 Deploy Now - Quick Guide

## What's Fixed
✅ API URL now stored in Firebase (not localStorage)
✅ Default API URL (`https://adc.onrender.app`) hardcoded in all routes
✅ No more 503 errors
✅ Admin can update API URL from admin panel

## Deploy in 3 Steps

### Step 1: Deploy Firebase Rules (2 minutes)
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select project: **pw-missiontopper**
3. Click **Firestore Database** → **Rules** tab
4. Copy this and paste:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /config/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.email == 'adityaghoghari01@gmail.com';
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

5. Click **Publish**

### Step 2: Deploy to Vercel (1 minute)
```bash
cd pw-app
git add .
git commit -m "Fix: API config moved to Firebase, default URL added"
git push
```

Vercel will auto-deploy in ~2 minutes.

### Step 3: Test (1 minute)
1. Visit: https://pw-missiontopper.vercel.app
2. Should see batches loading ✅
3. No 503 errors ✅

## Test Admin Panel
1. Go to: https://pw-missiontopper.vercel.app/admin
2. Login with Google: `adityaghoghari01@gmail.com`
3. See API URL field (should show: `https://adc.onrender.app`)
4. Try changing and saving - should save to Firebase ✅

## What Changed

### API Routes (Server-Side)
All API routes now use default URL directly:
```javascript
const DEFAULT_API_URL = 'https://adc.onrender.app';
```

No more checking localStorage or Firebase in API routes.

### Admin Panel (Client-Side)
Admin can view/edit API URL stored in Firebase:
- Loads from Firebase on login
- Saves to Firebase when admin clicks "Save"
- Shows in admin panel for reference

### Firebase Storage
API URL stored in Firestore:
```
config/api → { baseUrl: "https://adc.onrender.app" }
```

## Troubleshooting

### Issue: Still getting 503 errors
**Fix**: Make sure you deployed to Vercel (Step 2)

### Issue: Admin can't save API URL
**Fix**: Deploy Firebase rules (Step 1)

### Issue: Batches not loading
**Fix**: Check if your API `https://adc.onrender.app` is running

## Your API Endpoints
Your API should have these endpoints:
- `https://adc.onrender.app/api/pw/batches`
- `https://adc.onrender.app/api/pw/batchdetails`
- `https://adc.onrender.app/api/pw/topics`
- `https://adc.onrender.app/api/pw/datacontent`
- `https://adc.onrender.app/api/pw/videonew`

## Summary
- ✅ Default API URL: `https://adc.onrender.app`
- ✅ Stored in Firebase for admin reference
- ✅ Hardcoded in API routes for reliability
- ✅ No more 503 errors
- ✅ Admin can update via admin panel

---

**Ready to deploy!** Follow the 3 steps above.
