# PW App API Documentation

## Base URL
All API endpoints are relative to your Next.js app: `/api/`

Backend API base: `https://apiserver-henna.vercel.app` (called server-side only — never from browser to avoid CORS)

---

## Endpoints

### 1. Get Batch Details
**Endpoint:** `/api/batchdetails`
**Method:** `GET`

**Query Parameters:**
- `batchId` (required)

**Example:**
```
GET /api/batchdetails?batchId=698ad3519549b300a5e1cc6a
```

**Response:**
```json
{
  "data": {
    "subjects": [
      { "_id": "subject123", "subject": "Physics", "subjectSlug": "physics", "icon": "https://...", "lectureCount": 45 }
    ]
  }
}
```

---

### 2. Get Topics
**Endpoint:** `/api/topics`
**Method:** `GET`

**Query Parameters:**
- `batchId` (required)
- `subjectSlug` (required)

**Example:**
```
GET /api/topics?batchId=698ad3519549b300a5e1cc6a&subjectSlug=physics
```

---

### 3. Get Content
**Endpoint:** `/api/content`
**Method:** `GET`

**Query Parameters:**
- `batchId`, `subjectSlug`, `topicSlug` (required)
- `contentType` — `videos` | `notes` | `dpp`

**Example:**
```
GET /api/content?batchId=698ad3519549b300a5e1cc6a&subjectSlug=physics&topicSlug=mechanics&contentType=videos
```

**Video item shape:**
```json
{
  "_id": "schedule123",
  "topic": "Newton's Laws",
  "date": "2024-01-15",
  "videoDetails": { "findKey": "abc123", "name": "Newton's Laws", "duration": "45:30", "image": "https://..." },
  "isFree": false
}
```

---

### 4. Get Video URL
**Endpoint:** `/api/videourl`
**Method:** `GET`

Tries multiple backend endpoints in order until one returns a valid URL. Handles AES-GCM encrypted responses automatically.

**Query Parameters:**
- `findKey` (required) — video findKey from videoDetails
- `batchId`, `subjectId` (optional)

**Endpoints tried (in order):**
1. `/api/pw/get-url`
2. `/api/pw/video` (encrypted response — auto-decrypted)
3. `/api/pw/videonew`
4. `/api/pw/videoplay`
5. `/api/pw/videosuper`

**Response:**
```json
{ "url": "https://cdn.pw.live/video.mpd?Signature=...", "type": "mpd", "source": "get-url" }
```

`type` is one of: `mpd` | `hls` | `mp4` | `youtube`

---

### 5. Get Live Stream URL
**Endpoint:** `/api/liveurl`
**Method:** `GET`

Same flow as `/api/videourl` but with additional live-specific endpoints.

**Query Parameters:**
- `batch_id` (required)
- `video_id` or `schedule_id` (required)
- `subject_id` (optional)

**Endpoints tried:**
1. `/api/pw/get-url`
2. `/api/pw/video` (encrypted)
3. `/api/pw/videoplay`
4. `/api/live/get-url`
5. `/api/pw/live-url`
6. `/api/pw/videonew`

---

### 6. Get Today's Live Classes
**Endpoint:** `/api/live`
**Method:** `GET`

**Query Parameters:**
- `batchId` (required)

**Endpoints tried:**
1. POST `/api/pw/live` with `{ batchId }`
2. GET `/api/pw/live?batchId=`
3. GET `/api/pw/schedule?batchId=`
4. GET `/api/pw/live-classes?batchId=`

**Response** (array of class objects):
```json
[
  {
    "_id": "schedule123",
    "topic": "Determinants 05",
    "startTime": "2025-04-15T10:00:00.000Z",
    "tag": "live",
    "status": "live",
    "subjectId": { "_id": "sub123", "name": "Maths" },
    "teachers": [{ "name": "Sachin Sir" }],
    "videoDetails": { "findKey": "abc123", "image": "https://..." }
  }
]
```

**Status values:** `live` | `upcoming` | `ended` | `cancelled`

---

### 7. DRM Keys
**Endpoint:** `/api/drm`
**Method:** `GET`

**Query Parameters:**
- `findKey` (required)
- `batchId`, `subjectId`, `mpdUrl` (optional)

**Flow:**
1. Try `/api/pw/kid?mpdUrl=` to get KID
2. Fallback: fetch MPD XML directly, parse `default_KID` attribute
3. Fetch key via `/api/pw/otp?kid=`

**Response:**
```json
{ "clearKeys": { "kid-hex": "key-hex" } }
```

---

### 8. Stream Proxy
**Endpoint:** `/api/stream`
**Method:** `GET`

Proxies signed CDN URLs server-side (avoids CORS). For `.m3u8` files, rewrites relative segment URLs through proxy.

**Query Parameters:**
- `url` (required) — encoded signed CDN URL

**Response limit:** 50MB

---

### 9. PDF URL
**Endpoint:** `/api/pdfurl`
**Method:** `GET`

**Query Parameters:**
- `batchId`, `subjectId`, `scheduleId` (required)

**Response:**
```json
{ "pdfs": [{ "url": "https://static.pw.live/...", "name": "Notes.pdf", "topic": "Mechanics" }] }
```

---

### 10. PDF Proxy
**Endpoint:** `/api/pdfproxy`
**Method:** `GET`

**Query Parameters:**
- `url` (required), `filename` (required), `dl` (optional, `1` = force download)

---

## Featured Batches

| Batch Name | Batch ID | Tag |
|------------|----------|-----|
| Arjuna JEE 2027 | `698ad3519549b300a5e1cc6a` | JEE |
| Arjuna NEET 2027 | `69897f0ad7c19b7b2f7cc35f` | NEET |
| UDAAN 2.0 2027 (Class 10th) | `699434fe5423bd3d67b049b6` | 10th |
| Udaan 2027 (Class 10th) | `67790151518b938bc630052d` | 10th |

---

## Recorded Video Player (`/player`)

**File:** `pages/player.js`

**URL format:**
```
/player?video_id={findKey}&batch_id={batchId}&subject_id={subjectId}&schedule_id={scheduleId}&title={encodedTitle}
```

### How it works

```
1. router.isReady
       ↓
2. If direct URL param (mpd/url) → skip fetch
       ↓
3. GET /api/videourl?batchId=&subjectId=&findKey=
       ↓ returns { url, type }
4. Detect type:
   - "youtube"  → embed YouTube iframe
   - "hls"      → HLS.js
   - "mpd"      → Shaka Player (with DRM + signed URL)
   - "mp4"      → native <video>
       ↓
5. Player ready → autoplay + resume from localStorage
```

### Shaka Player init (MPD/DRM)

```js
// 1. Fetch DRM keys in parallel with Shaka import
const [shakaModule, drmData] = await Promise.all([
  import('shaka-player'),
  fetch('/api/drm?findKey=&batchId=&subjectId=&mpdUrl=').then(r => r.json())
]);

// 2. Quality lock object (same as reference implementation)
const qualityLocked = { active: false, height: null, changing: false };

// 3. adaptation event — maintains quality lock after ABR switches
player.addEventListener('adaptation', () => {
  if (qualityLocked.active && qualityLocked.height && !qualityLocked.changing) {
    const current = player.getVariantTracks().filter(t => t.active)[0];
    if (current?.height !== qualityLocked.height) {
      const target = player.getVariantTracks().find(t => t.height === qualityLocked.height);
      if (target) { qualityLocked.changing = true; player.selectVariantTrack(target, true); }
    }
  }
});

// 4. Network filter — attach CloudFront signed params to every segment
player.getNetworkingEngine().registerRequestFilter((type, request) => {
  const uri = request.uris[0];
  if (!uri.includes('Signature=') && signedParams) {
    request.uris[0] = uri.includes('?') ? uri + '&' + signedParams.slice(1) : uri + signedParams;
  }
});

// 5. Load — try direct first, fallback to /api/stream proxy
try { await player.load(baseUrl); }
catch { await player.load(`/api/stream?url=${encodeURIComponent(url)}`); }

// 6. Restore saved quality with retry loop
const savedHeight = parseInt(localStorage.getItem('pw_quality'), 10);
// ... retry up to 5 times with 500ms interval
```

### HLS.js init

```js
const hls = new Hls({ enableWorker: true, startLevel: -1 });
hls.loadSource(url);
hls.attachMedia(videoEl);
hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
  // Build quality list: [Auto, 1080p, 720p, ...]
  // Restore saved quality from localStorage
});
```

### UI Components

| Component | Description |
|-----------|-------------|
| `ProgressBar` | Seekable bar with buffered indicator + hover preview |
| `Controls` | Play/pause, ±5s seek, volume, speed (0.25x–2x), quality, PiP, fullscreen |
| `SeekRipple` | ⏪/⏩ animation on double-tap |
| `TapZones` | Left/right invisible zones for mobile double-tap seek |
| `NotesSidebar` | Slide-in panel with PDF notes for the lecture |

**Features:**
- Speed: `0.25x` to `2x`, saved to `localStorage` key `pw_speed`
- Quality: saved to `localStorage` key `pw_quality` (stored as height number e.g. `720`)
- Resume: saved every 5s to `localStorage` key `pw_resume_{video_id}`, restored if > 5s
- Auto-hide controls after 3s inactivity

---

## Live Player (`/live-player`)

**File:** `pages/live-player.js`

**URL format:**
```
/live-player?batch_id={batchId}&video_id={videoId}&schedule_id={scheduleId}&subject_id={subjectId}&title={encodedTitle}
```

### How it works

```
1. router.isReady
       ↓
2. If direct url param → skip fetch
       ↓
3. GET /api/videourl?batchId=&subjectId=&findKey=
   (server-side proxy — no CORS issue)
       ↓ returns { url, type }
4. YouTube → iframe embed
   MPD/HLS → Shaka Player
       ↓
5. If no URL → phase = 'waiting', auto-retry every 15s
```

### Shaka Player init (live)

```js
// Quality lock — same pattern as recorded player
const qualityLocked = { active: false, height: null, changing: false };

player.configure({ abr: { enabled: false } });

// adaptation event — maintain quality lock
player.addEventListener('adaptation', () => { /* same as recorded */ });

// Network filter — attach signed params
player.getNetworkingEngine().registerRequestFilter((type, request) => {
  if (!request.uris[0].includes('Signature=') && queryStr) {
    request.uris[0] = uri + queryStr;
  }
});

await player.attach(videoEl);
await player.load(baseUrl);  // baseUrl = URL without signed params

// Restore saved quality with retry loop
const savedHeight = parseInt(localStorage.getItem('pw_live_quality'), 10);
```

### Live vs Recorded differences

| Feature | Recorded (`/player`) | Live (`/live-player`) |
|---------|---------------------|----------------------|
| Progress bar | Seekable, shows buffered | Live edge indicator only |
| Seek | ±5s buttons + double-tap | Right tap = jump to live edge |
| Speed selector | Yes (0.25x–2x) | No |
| Resume playback | Yes (localStorage) | No |
| Notes sidebar | Yes | No |
| Color theme | Orange | Red |
| Auto-retry | No | Yes — every 15s if stream not started |
| "Go Live" button | No | Yes — jumps to live edge |
| Error state | Retry button | Waiting state + countdown |

### Live classes list (index page)

Live classes are shown in `SubjectsView` via `LiveClassesSection` component with 3 tabs:

- **🔴 Live** — `tag === 'live'` or `status === 'live'`
- **⏰ Upcoming** — `tag === 'upcoming'` or `status === 'upcoming'`
- **▶ Recorded** — `tag === 'ended'` or topic contains "recorded"

Each card shows: thumbnail, title, subject, teacher name, time, status badge.

Clicking live/upcoming → `/live-player`
Clicking recorded/ended → `/player`

---

## Encryption

Backend API responses may be AES-GCM encrypted. Decryption:

- **Server-side** (`lib/decrypt.js`): Node.js `crypto` module
- **Browser-side** (`lib/decryptBrowser.js`): Web Crypto API

```js
// Key: "maggikhalo" padded to 32 bytes
// Format: "hex_iv:hex_ciphertext_with_auth_tag"
const [ivHex, dataHex] = payload.split(':');
// AES-256-GCM decrypt → JSON.parse
```

---

## Error Handling

All endpoints return errors as:
```json
{ "error": "message" }
```

HTTP codes: `400` bad request, `404` not found, `500` server error, `503` config error

---

## Notes

1. All backend calls go through Next.js API routes (server-side) — never directly from browser
2. `apiserver-henna.vercel.app` has CORS restricted to `studysagar.vercel.app` — always proxy
3. The "All Content" virtual topic (`__all__`) aggregates all topics in a subject
4. Quality preference stored as height number (`720`, `1080`) not label string
