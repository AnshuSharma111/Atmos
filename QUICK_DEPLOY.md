# 🚀 Atmos - Quick Deploy to Production

## What This Does
Deploys your CCTV streaming system with:
- 🌐 **Frontend**: Viewer website on GitHub Pages (free)
- 🔌 **Backend**: WebRTC signaling server on Render/Vercel (free tier)
- 📱 **Mobile**: React Native app connects to deployed backend

---

## 🎯 One-Command Deploy

### 1. Enable GitHub Pages (One-Time Setup)
```bash
# No command needed - just:
# 1. Go to: https://github.com/[YOUR-USERNAME]/Atmos/settings/pages
# 2. Source: Select "GitHub Actions"
# 3. Save
```

### 2. Deploy Everything
```bash
git add .
git commit -m "🚀 Deploy Atmos"
git push origin main
```

**That's it!** GitHub Actions will deploy your frontend automatically.

---

## 🔧 Backend Setup (5 Minutes)

### Render.com (Easiest - Recommended)
1. **Sign up**: https://render.com
2. **New Web Service** → Connect GitHub repo
3. **Settings**:
   - Build: `npm install`
   - Start: `node server.js`
   - Environment: Node
4. **Deploy** → Copy your URL (e.g., `https://atmos-xyz.onrender.com`)

### Update Mobile App
```bash
# Edit App.tsx line ~139:
const SERVER_URL = 'https://atmos-xyz.onrender.com'; # ← Your URL here

# Rebuild:
cd android && ./gradlew clean && cd .. && npx react-native run-android
```

---

## ✅ Test Your Deployment

### 1. Test Backend
```bash
curl https://your-backend-url.com/api/debug
# Should return: {"status":"online","broadcasters":0,...}
```

### 2. Test Frontend
Open: `https://[YOUR-USERNAME].github.io/Atmos/`
- Should see viewer interface
- Click "Connect" button
- Should connect to backend

### 3. Test Full System
1. **Mobile**: Open app → Start streaming
2. **Browser**: Open viewer → Click "Connect"
3. **Result**: See your stream!
4. **Bonus**: Click "📷 Switch Camera" to toggle cameras

---

## 📍 Your URLs

After deployment, you'll have:

| Service | URL | What It Does |
|---------|-----|--------------|
| **Viewer Website** | `https://[username].github.io/Atmos/` | View all streams |
| **Backend Server** | `https://your-backend.onrender.com` | WebRTC signaling |
| **API Debug** | `https://your-backend.onrender.com/api/debug` | Server status |

---

## 🐛 Troubleshooting

**Frontend not loading?**
```bash
# Check deployment status:
https://github.com/[username]/Atmos/actions

# Redeploy:
git commit --allow-empty -m "Redeploy"
git push origin main
```

**Backend connection fails?**
```bash
# Test server:
curl https://your-backend-url.com/api/debug

# Check logs on Render dashboard
```

**Mobile app can't connect?**
```bash
# 1. Verify SERVER_URL in App.tsx matches your backend URL
# 2. Rebuild app: cd android && ./gradlew clean && cd .. && npx react-native run-android
# 3. Check server logs
```

---

## 📊 What Gets Deployed

### Frontend (GitHub Pages)
- `viewer.html` → Main viewer interface
- `/public/` → Static assets
- Auto-deploys on every push to `main`

### Backend (Render/Vercel)
- `server.js` → WebRTC signaling server
- `socket-handlers.js` → Socket.io logic
- `/api/` → API endpoints
- Runs 24/7 (on Render free tier, may sleep after 15 min idle)

---

## 💡 Pro Tips

1. **Keep Backend Awake** (Render free tier sleeps):
   ```bash
   # Add to your mobile app or use a cron job:
   curl https://your-backend.onrender.com/api/debug
   ```

2. **Monitor Deployments**:
   - GitHub Actions: Check Actions tab
   - Render: Dashboard logs
   - Set up notifications

3. **Update URLs**:
   - After first deploy, update `SERVER_URL` in `App.tsx`
   - Rebuild mobile app
   - Share viewer URL with team

4. **Security** (for production):
   - Add authentication
   - Use environment variables
   - Enable rate limiting
   - Set up HTTPS only

---

## 🎉 You're Live!

After completing the steps above:
- ✅ Viewer website is live on GitHub Pages
- ✅ Backend server is running on Render/Vercel
- ✅ Mobile app connects to production server
- ✅ Multiple broadcasters can stream
- ✅ Multiple viewers can watch
- ✅ Camera switching works

**Share your viewer URL and start streaming!**

---

## 📚 More Help

- **Detailed Guide**: See `DEPLOYMENT.md`
- **Checklist**: See `DEPLOYMENT_CHECKLIST.md`
- **Issues**: Check GitHub Issues tab

---

## 🔄 Future Updates

To deploy updates:
```bash
git add .
git commit -m "Your update message"
git push origin main
```

GitHub Pages redeploys automatically in ~2 minutes!
