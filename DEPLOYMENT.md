# Atmos Deployment Guide

## 🚀 Quick Deploy

### Frontend (Viewer Website) - GitHub Pages
The viewer website is automatically deployed to GitHub Pages on every push to `main`.

**Setup Steps:**
1. Go to your repository settings → Pages
2. Source: "GitHub Actions"
3. Push to `main` branch
4. Your site will be live at: `https://yourusername.github.io/Atmos/`

**What gets deployed:**
- `viewer.html` (as index.html)
- All files in `/public/` directory

---

### Backend (Signaling Server) - Multiple Options

#### Option 1: Render.com (Recommended - Free Tier Available)

**Setup:**
1. Create account at [render.com](https://render.com)
2. Create new "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** Node
   - **Port:** 3001 (or use `$PORT` env variable)

5. Add to repository secrets:
   - Go to GitHub repo → Settings → Secrets and variables → Actions
   - Add `RENDER_TOKEN` (get from Render.com dashboard)
   - Add `RENDER_SERVICE_ID` (from Render service URL)

6. Enable auto-deploy:
   - Render will auto-deploy on every push to `main`
   - Or use `.github/workflows/render.yml` for manual control

**Environment Variables on Render:**
- `NODE_ENV=production`
- `PORT=3001` (or leave empty to use Render's default)

---

#### Option 2: Vercel (Serverless)

**Setup:**
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel` (follow prompts)
3. For production: `vercel --prod`

**Auto-deploy:**
- Connect your GitHub repo in Vercel dashboard
- Auto-deploys on push to `main`

**Note:** Socket.io requires special configuration on serverless platforms. The `vercel.json` file is already configured.

---

#### Option 3: Heroku

**Setup:**
1. Create Heroku account
2. Install Heroku CLI
3. Create app: `heroku create atmos-streaming`
4. Deploy: `git push heroku main`

**Auto-deploy with GitHub Actions:**
- Add `HEROKU_API_KEY` to GitHub secrets
- Add `HEROKU_APP_NAME` to GitHub secrets
- Uses `.github/workflows/heroku.yml`

---

## 📱 Mobile App Configuration

After deploying the backend, update the mobile app's server URL:

**In `App.tsx` (line ~139):**
```typescript
const SERVER_URL = 'https://your-backend-url.com';
```

Replace with your deployed server URL:
- Render: `https://atmos-streaming.onrender.com`
- Vercel: `https://atmos-streaming.vercel.app`
- Heroku: `https://atmos-streaming.herokuapp.com`

Then rebuild the app:
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

---

## 🔧 Configuration Files

- **`vercel.json`** - Vercel serverless configuration
- **`Dockerfile`** - Docker container configuration
- **`Procfile`** - Heroku process configuration
- **`.github/workflows/deploy.yml`** - GitHub Pages deployment
- **`.github/workflows/render.yml`** - Render.com deployment
- **`.github/workflows/heroku.yml`** - Heroku deployment

---

## 🌐 Testing Deployment

### Test Frontend:
1. Visit your GitHub Pages URL
2. Should see the viewer interface
3. Click "Connect" button

### Test Backend:
1. Visit `https://your-backend-url.com/api/debug`
2. Should see server info and status
3. Check WebSocket connection in viewer

### Test Full System:
1. Open mobile app
2. Start streaming
3. Open viewer website
4. Click "Connect"
5. Should see your stream appear

---

## 🐛 Troubleshooting

**Frontend not loading:**
- Check GitHub Actions tab for deployment logs
- Verify Pages is enabled in repo settings
- Clear browser cache

**Backend connection fails:**
- Check server logs on your hosting platform
- Verify PORT environment variable
- Check CORS settings in `server.js`

**Mobile app can't connect:**
- Verify SERVER_URL in `App.tsx`
- Check if server is using HTTPS (required for production)
- Test with `curl https://your-backend-url.com/api/debug`

**WebSocket issues:**
- Ensure hosting platform supports WebSockets
- Check Socket.io configuration
- Verify firewall/proxy settings

---

## 📊 Monitoring

- **Render:** View logs in Render dashboard
- **Vercel:** View function logs in Vercel dashboard
- **Heroku:** Use `heroku logs --tail`

---

## 🔐 Security Considerations

For production:
1. Add authentication to viewer
2. Use environment variables for secrets
3. Enable HTTPS only
4. Add rate limiting
5. Implement proper CORS policies
6. Add API authentication tokens

---

## 💰 Costs

- **GitHub Pages:** Free
- **Render Free Tier:** Free (500 hrs/month, spins down after 15 min inactivity)
- **Vercel Hobby:** Free (limited function duration)
- **Heroku Free Tier:** Discontinued (paid plans required)

**Recommended:** GitHub Pages (frontend) + Render Free Tier (backend)
