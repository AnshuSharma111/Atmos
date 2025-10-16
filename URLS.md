# 🌐 Atmos URL Configuration

## 🎯 Production URLs (LIVE)

### Frontend (GitHub Pages)
```
https://anshusharma111.github.io/Atmos/
```
**What:** Viewer website (static HTML)  
**Purpose:** Share this URL to watch streams  
**Status:** ✅ Always available, never sleeps  
**Auto-deploys:** On push to `main` branch

### Backend (Render)
```
https://atmos-7hli.onrender.com
```
**What:** WebRTC signaling server + WebSocket handler  
**Purpose:** Mobile app connects here, viewer connects here  
**Status:** ✅ Live (may sleep after 15 min idle)  
**Auto-deploys:** On push to `main` branch

### Backend Viewer (Backup)
```
https://atmos-7hli.onrender.com/viewer.html
```
**What:** Same viewer as GitHub Pages  
**Purpose:** Backup if GitHub Pages has issues  
**Status:** ✅ Available but may be slow on first load

### API Endpoints
```
https://atmos-7hli.onrender.com/api/debug
https://atmos-7hli.onrender.com/api/server-info
```
**What:** Server status and diagnostics  
**Purpose:** Check if backend is alive

---

## 📱 Mobile App Configuration

**File:** `App.tsx` (line 33)

```typescript
const SIGNALING_SERVER_URL = 'https://atmos-7hli.onrender.com';
```

**Status:** ✅ Already configured  
**Action needed:** None - ready to use!

---

## 🌐 Viewer Configuration

**File:** `viewer.html` (lines 170-230)

### Automatic URL Detection:

| Environment | Viewer URL | Connects To |
|-------------|-----------|-------------|
| **GitHub Pages** | `https://anshusharma111.github.io/Atmos/` | → `https://atmos-7hli.onrender.com` |
| **Render Direct** | `https://atmos-7hli.onrender.com/viewer.html` | → Same server (self) |
| **Local Dev** | `http://localhost:3001/viewer.html` | → `http://localhost:3001` |

**Status:** ✅ Already configured  
**Action needed:** None - auto-detects environment!

---

## 🔄 How It All Connects

```
┌─────────────────────────────────────────────────────┐
│                  Mobile App (React Native)          │
│                                                     │
│  const SIGNALING_SERVER_URL =                      │
│    'https://atmos-7hli.onrender.com'               │
└────────────────┬────────────────────────────────────┘
                 │
                 ├─── WebSocket Connection
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│          Render Backend Server                      │
│      https://atmos-7hli.onrender.com                │
│                                                     │
│  • WebRTC signaling (Socket.io)                    │
│  • WebSocket connections                            │
│  • Stream coordination                              │
└────────────────┬────────────────────────────────────┘
                 │
                 ├─── WebSocket Connection
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│         GitHub Pages Viewer                         │
│   https://anshusharma111.github.io/Atmos/           │
│                                                     │
│  Detects environment → Connects to Render           │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Testing URLs

### Test Backend is Alive
```powershell
curl https://atmos-7hli.onrender.com/api/debug
```

**Expected Response:**
```json
{
  "status": "online",
  "server": "Atmos WebRTC Signaling Server",
  "broadcasters": {"count": 0, "active": []},
  "serverTime": "2025-10-17T...",
  "uptime": 123.45,
  "environment": "production"
}
```

### Test Viewer (GitHub Pages)
```
Open: https://anshusharma111.github.io/Atmos/
1. Click "Connect" button
2. Open browser console (F12)
3. Should see: "[VIEWER] 🌐 GitHub Pages mode"
4. Should see: "[VIEWER] 🔌 Backend: https://atmos-7hli.onrender.com"
5. Status should show "Connected"
```

### Test Mobile App
```
1. Open mobile app
2. Start streaming
3. Console should show: "Connecting to signaling server at https://atmos-7hli.onrender.com"
4. Should see "Connected" status
5. Open viewer - stream should appear
```

---

## 🔧 Local Development URLs

When running locally (for development):

### Local Backend
```
http://localhost:3001
http://YOUR_COMPUTER_IP:3001
```

### Local Viewer
```
http://localhost:3001/viewer.html
```

### Local Mobile App Configuration
Change `App.tsx` temporarily:
```typescript
const SIGNALING_SERVER_URL = 'http://YOUR_COMPUTER_IP:3001';
```
**Remember:** Change back to Render URL before deploying!

---

## 📊 URL Summary Table

| Component | Development | Production |
|-----------|-------------|-----------|
| **Backend Server** | `http://localhost:3001` | `https://atmos-7hli.onrender.com` |
| **Viewer** | `http://localhost:3001/viewer.html` | `https://anshusharma111.github.io/Atmos/` |
| **Mobile App** | `http://YOUR_IP:3001` | `https://atmos-7hli.onrender.com` |
| **API Debug** | `http://localhost:3001/api/debug` | `https://atmos-7hli.onrender.com/api/debug` |

---

## 🚨 Important Notes

### Render Free Tier Behavior
- ⚠️ **Sleeps after 15 min idle**
- 🔄 **First connection takes ~30 seconds to wake**
- ✅ **After wake-up, works instantly**
- 💡 **Solution:** Use UptimeRobot (optional) to keep awake

### GitHub Pages
- ✅ **Never sleeps**
- ✅ **Always instant load**
- ✅ **Global CDN (fast everywhere)**
- 💰 **100% free forever**

### HTTPS Requirement
- 🔒 WebRTC requires HTTPS in production
- ✅ Both GitHub Pages and Render provide free SSL
- ✅ All production URLs use HTTPS

---

## 🎯 Share These URLs

### For Viewers (Watchers)
```
Share this: https://anshusharma111.github.io/Atmos/
```
**Instructions:**
1. Open the link
2. Click "Connect"
3. You'll see all active streams
4. Click "📷 Switch Camera" to toggle broadcaster cameras

### For Broadcasters (Streamers)
```
Download the mobile app (APK)
No URL needed - app has Render URL built-in!
```

---

## 🔍 Troubleshooting URLs

### Viewer can't connect?
```
1. Check backend: curl https://atmos-7hli.onrender.com/api/debug
2. If slow: Backend is waking up (wait 30 sec)
3. Check browser console for errors
```

### Mobile app can't connect?
```
1. Verify App.tsx has: https://atmos-7hli.onrender.com
2. Rebuild app if URL was changed
3. Check backend is awake: curl https://atmos-7hli.onrender.com/api/debug
```

### Stream not appearing?
```
1. Mobile shows "Connected"? ✅
2. Viewer shows "Connected"? ✅
3. Check browser console for WebRTC errors
4. Try camera switch button
```

---

## ✅ Current Configuration Status

- ✅ **App.tsx:** Configured with Render URL
- ✅ **viewer.html:** Auto-detects GitHub Pages → Connects to Render
- ✅ **server.js:** Logs correct production URLs
- ✅ **GitHub Actions:** Deploys to GitHub Pages automatically
- ✅ **Render:** Auto-deploys from GitHub

**Everything is coordinated and ready to use!** 🎉
