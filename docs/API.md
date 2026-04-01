# PW App API Documentation

## Base URL
All API endpoints are relative to your Next.js app: `/api/`

---

## Endpoints

### 1. Get Batch Details
**Endpoint:** `/api/batchdetails`  
**Method:** `GET`  
**Description:** Fetches batch information including subjects list

**Query Parameters:**
- `batchId` (required) - The batch ID

**Example Request:**
```
GET /api/batchdetails?batchId=698ad3519549b300a5e1cc6a
```

**Example Response:**
```json
{
  "data": {
    "subjects": [
      {
        "_id": "subject123",
        "subject": "Physics",
        "subjectSlug": "physics",
        "icon": "https://...",
        "lectureCount": 45
      }
    ]
  }
}
```

---

### 2. Get Topics
**Endpoint:** `/api/topics`  
**Method:** `GET`  
**Description:** Fetches all topics/chapters for a subject

**Query Parameters:**
- `batchId` (required) - The batch ID
- `subjectSlug` (required) - Subject slug (e.g., "physics")

**Example Request:**
```
GET /api/topics?batchId=698ad3519549b300a5e1cc6a&subjectSlug=physics
```

**Example Response:**
```json
{
  "data": [
    {
      "_id": "topic123",
      "name": "Mechanics",
      "slug": "mechanics",
      "displayOrder": 1,
      "lectureVideos": 10,
      "notes": 5,
      "exercises": 3
    }
  ]
}
```

---

### 3. Get Content
**Endpoint:** `/api/content`  
**Method:** `GET`  
**Description:** Fetches videos, notes, or DPP for a specific topic

**Query Parameters:**
- `batchId` (required) - The batch ID
- `subjectSlug` (required) - Subject slug
- `topicSlug` (required) - Topic slug
- `contentType` (required) - Type of content: `videos`, `notes`, or `dpp`

**Example Request:**
```
GET /api/content?batchId=698ad3519549b300a5e1cc6a&subjectSlug=physics&topicSlug=mechanics&contentType=videos
```

**Example Response:**
```json
{
  "data": [
    {
      "_id": "video123",
      "topic": "Newton's Laws",
      "date": "2024-01-15",
      "videoDetails": {
        "findKey": "abc123",
        "name": "Newton's Laws Lecture",
        "duration": "45:30",
        "image": "https://...",
        "videoUrl": "https://..."
      },
      "isFree": false
    }
  ]
}
```

---

### 4. Get PDF URL
**Endpoint:** `/api/pdfurl`  
**Method:** `GET`  
**Description:** Fetches PDF download URLs for notes/DPP

**Query Parameters:**
- `batchId` (required) - The batch ID
- `subjectId` (required) - Subject ID or slug
- `scheduleId` (required) - Schedule/item ID

**Example Request:**
```
GET /api/pdfurl?batchId=698ad3519549b300a5e1cc6a&subjectId=physics&scheduleId=schedule123
```

**Example Response:**
```json
{
  "pdfs": [
    {
      "url": "https://static.pw.live/...",
      "name": "Chapter 1 Notes.pdf",
      "topic": "Mechanics",
      "note": ""
    }
  ]
}
```

---

### 5. PDF Proxy
**Endpoint:** `/api/pdfproxy`  
**Method:** `GET`  
**Description:** Proxies PDF files for viewing/downloading

**Query Parameters:**
- `url` (required) - The PDF URL to proxy
- `filename` (required) - Filename for download
- `dl` (optional) - Set to `1` to force download

**Example Request:**
```
GET /api/pdfproxy?url=https://static.pw.live/file.pdf&filename=notes.pdf
GET /api/pdfproxy?url=https://static.pw.live/file.pdf&filename=notes.pdf&dl=1
```

---

### 6. DRM Keys
**Endpoint:** `/api/drm`  
**Method:** `GET`  
**Description:** Fetches DRM decryption keys for video playback

**Query Parameters:**
- `findKey` (required) - Video find key
- `batchId` (optional) - Batch ID
- `subjectId` (optional) - Subject ID
- `mpdUrl` (optional) - MPD manifest URL

**Example Request:**
```
GET /api/drm?findKey=abc123&batchId=698ad3519549b300a5e1cc6a
```

**Example Response:**
```json
{
  "clearKeys": {
    "key-id-1": "decryption-key-1",
    "key-id-2": "decryption-key-2"
  }
}
```

---

### 7. Stream Proxy
**Endpoint:** `/api/stream`  
**Method:** `GET`  
**Description:** Proxies video stream URLs (MPD manifests)

**Query Parameters:**
- `url` (required) - The stream URL to proxy

**Example Request:**
```
GET /api/stream?url=https://video.pw.live/manifest.mpd
```

---

## Featured Batches

Currently featured batches in the app:

| Batch Name | Batch ID | Tag |
|------------|----------|-----|
| Arjuna JEE 2027 | `698ad3519549b300a5e1cc6a` | JEE |
| Arjuna NEET 2027 | `69897f0ad7c19b7b2f7cc35f` | NEET |
| UDAAN 2.0 2027 (Class 10th) | `699434fe5423bd3d67b049b6` | 10th |
| Udaan 2027 (Class 10th) | `67790151518b938bc630052d` | 10th |

---

## Video Player Integration

### DeltaStudy Player
Videos are played using the DeltaStudy player:

**Player URL Format:**
```
https://deltastudy.site/pw/drm/play?video_id={findKey}&subject_slug={subjectSlug}&batch_id={batchId}&schedule_id={scheduleId}&subject_id={subjectId}&topicSlug={topicSlug}
```

**Parameters:**
- `video_id` - Video find key from videoDetails
- `subject_slug` - Subject slug (e.g., "physics")
- `batch_id` - Batch ID
- `schedule_id` - Schedule/item ID
- `subject_id` - Subject ID
- `topicSlug` - Topic slug

**Example:**
```
https://deltastudy.site/pw/drm/play?video_id=abc123&subject_slug=physics&batch_id=698ad3519549b300a5e1cc6a&schedule_id=schedule123&subject_id=physics&topicSlug=mechanics
```

---

## Error Handling

All API endpoints may return errors in the following format:

```json
{
  "error": "Error message",
  "status": 400
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing parameters)
- `404` - Not Found
- `500` - Internal Server Error

---

## Notes

1. All API calls are made client-side from the Next.js frontend
2. Video playback requires DRM keys which are fetched separately
3. PDFs are proxied through the app to handle CORS issues
4. The "All Content" virtual topic (`__all__`) aggregates content from all topics in a subject
