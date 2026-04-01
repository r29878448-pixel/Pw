# Firebase Security Rules Setup

## Overview
Firebase security rules control who can read/write data in Firestore.

## Current Rules

### Config Collection
- **Read**: Anyone (public)
- **Write**: Only admin (`adityaghoghari01@gmail.com`)

This allows:
- ✅ API routes to read API URL (no auth needed)
- ✅ Admin to update API URL from admin panel
- ❌ Regular users cannot modify config

## How to Deploy Rules

### Option 1: Firebase Console (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `pw-missiontopper`
3. Click "Firestore Database" in left menu
4. Click "Rules" tab
5. Copy content from `firestore.rules` file
6. Paste into the rules editor
7. Click "Publish"

### Option 2: Firebase CLI
```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project (if not done)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

## Rules File Location
- File: `pw-app/firestore.rules`
- This file is for reference only
- Must be deployed via Firebase Console or CLI

## Testing Rules

### Test 1: Public Read Access
```javascript
// Anyone can read config (no auth needed)
const docRef = doc(db, 'config', 'api');
const docSnap = await getDoc(docRef);
// Should work ✅
```

### Test 2: Admin Write Access
```javascript
// Admin can write (when authenticated)
const docRef = doc(db, 'config', 'api');
await setDoc(docRef, { baseUrl: 'https://new-api.com' });
// Should work for admin ✅
// Should fail for non-admin ❌
```

## Important Notes

⚠️ **Deploy Rules First**: Deploy security rules before testing the app

⚠️ **Admin Email**: Rules check for exact email: `adityaghoghari01@gmail.com`

⚠️ **Public Read**: Config is readable by everyone (needed for API routes)

## Troubleshooting

### Error: "Missing or insufficient permissions"
- **Cause**: Security rules not deployed or incorrect
- **Fix**: Deploy rules via Firebase Console

### Error: "PERMISSION_DENIED"
- **Cause**: Non-admin trying to write to config
- **Fix**: Login with admin account

---

**Next Step**: Deploy these rules to Firebase Console
