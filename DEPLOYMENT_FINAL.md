# 🚀 Atmos Deployment - Simplified

## ✅ Current Architecture

**Frontend:** GitHub Pages (Free, Fast CDN)
- URL: `https://AnshuSharma111.github.io/Atmos/`
- Hosts: Static viewer website
- Auto-deploys: On every push to `main`

**Backend:** Render.com (Free Tier)
- URL: `https://atmos-7hli.onrender.com`
- Hosts: WebRTC signaling server
- Auto-deploys: On every push to `main`

**Mobile App:** React Native
- Connects to: Render backend

---

## 📦 What's Deployed

### GitHub Pages (Frontend)
```
https://AnshuSharma111.github.io/Atmos/
├── index.html (viewer.html)
└── Auto-connects to Render backend
```

### Render (Backend)
```
https://atmos-7hli.onrender.com
├── server.js (WebRTC signaling)
├── socket-handlers.js
├── viewer.html (backup)
└── WebSocket support
```

---

## 🔄 How Updates Work

### 1. Push Code
```powershell
git add .
git commit -m "Your update"
git push origin main
```

### 2. Auto-Deployment
- **GitHub Pages**: Deploys in ~2 minutes
- **Render**: Deploys in ~3 minutes

### 3. Monitor Progress
- GitHub: https://github.com/AnshuSharma111/Atmos/actions
- Render: https://dashboard.render.com/

---

## 🌐 Your URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Viewer (Production)** | https://AnshuSharma111.github.io/Atmos/ | Share this with team |
| **Viewer (Backup)** | https://atmos-7hli.onrender.com/viewer.html | If GitHub Pages has issues |
| **Backend** | https://atmos-7hli.onrender.com | Mobile app connects here |
| **API Debug** | https://atmos-7hli.onrender.com/api/debug | Check server status |

---

## 🧪 Testing

### Test Frontend (GitHub Pages)
```powershell
# Open in browser:
start https://AnshuSharma111.github.io/Atmos/
```

### Test Backend (Render)
```powershell
# Check if alive:
curl https://atmos-7hli.onrender.com/api/debug
```

### Test Full System
1. **Mobile**: Start streaming
2. **Browser**: Open GitHub Pages URL → Click "Connect"
3. **Result**: See stream!

---

## 📱 Mobile App Configuration

Already configured in `App.tsx`:
```typescript
const SIGNALING_SERVER_URL = 'https://atmos-7hli.onrender.com';
```

No changes needed! ✅

---

## 🔧 Troubleshooting

### GitHub Pages not updating?
```powershell
# Check Actions status:
start https://github.com/AnshuSharma111/Atmos/actions

# Force redeploy:
git commit --allow-empty -m "Redeploy"
git push origin main
```

### Render backend sleeping?
- First connection takes ~30 seconds to wake
- Solution: Set up uptime monitor (optional)

### Can't connect from viewer?
```powershell
# 1. Check backend is alive:
curl https://atmos-7hli.onrender.com/api/debug

# 2. Check browser console (F12)
# Look for connection errors

# 3. Verify URLs in viewer.html
```

---

## 💡 Best Practices

### Share the Right URL
✅ **Share:** `https://AnshuSharma111.github.io/Atmos/`
- Always available
- Fast loading
- Professional

❌ **Don't share:** `https://atmos-7hli.onrender.com/viewer.html`
- May sleep after 15 min
- Slower first load

### Keep Backend Awake (Optional)
Use UptimeRobot to ping every 5 minutes:
- Sign up: https://uptimerobot.com
- Monitor: `https://atmos-7hli.onrender.com/api/debug`
- Frequency: Every 5 minutes

---

## 📊 Deployment Status

| Component | Status | Last Deploy |
|-----------|--------|-------------|
| GitHub Pages | ✅ Live | Auto |
| Render Backend | ✅ Live | Auto |
| Mobile App | ✅ Configured | Manual rebuild |

---

## 🎉 You're All Set!

Your Atmos system is fully deployed:
- ✅ Frontend on GitHub Pages
- ✅ Backend on Render
- ✅ Mobile app configured
- ✅ Camera switching enabled
- ✅ Auto-deployment enabled

**Just push code and everything updates automatically!**
