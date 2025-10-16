# 🚀 Deployment Checklist

## Pre-Deployment
- [ ] All code changes committed
- [ ] Tested locally (mobile app + viewer + server)
- [ ] Camera switching works
- [ ] No console errors

## GitHub Pages Setup (Frontend)
1. [ ] Go to repository Settings
2. [ ] Navigate to Pages section
3. [ ] Source: Select "GitHub Actions"
4. [ ] Save settings

## Backend Deployment (Choose One)

### Option A: Render.com (Recommended)
1. [ ] Sign up at render.com
2. [ ] Create new "Web Service"
3. [ ] Connect GitHub repository
4. [ ] Set Build Command: `npm install`
5. [ ] Set Start Command: `node server.js`
6. [ ] Set Environment: `NODE_ENV=production`
7. [ ] Deploy
8. [ ] Copy your Render URL (e.g., `https://atmos-xyz.onrender.com`)

### Option B: Vercel
1. [ ] Install Vercel CLI: `npm i -g vercel`
2. [ ] Run: `vercel`
3. [ ] Follow prompts
4. [ ] Deploy: `vercel --prod`
5. [ ] Copy your Vercel URL

### Option C: Heroku
1. [ ] Create Heroku app
2. [ ] Add GitHub secrets: `HEROKU_API_KEY` and `HEROKU_APP_NAME`
3. [ ] Push to trigger deployment
4. [ ] Copy your Heroku URL

## Update Mobile App
1. [ ] Open `App.tsx`
2. [ ] Find line ~139: `const SERVER_URL`
3. [ ] Replace with your backend URL:
   ```typescript
   const SERVER_URL = 'https://your-backend-url.com'; // ← Your deployed server
   ```
4. [ ] Save file
5. [ ] Rebuild app:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx react-native run-android
   ```

## Testing
- [ ] Mobile app connects to deployed server
- [ ] Start streaming from mobile
- [ ] Open viewer website (GitHub Pages URL)
- [ ] Click "Connect"
- [ ] Stream appears on viewer
- [ ] Camera switch button works
- [ ] Multiple viewers can connect
- [ ] Multiple broadcasters can stream

## Your URLs
**Frontend (Viewer):**
- GitHub Pages: `https://[username].github.io/Atmos/`

**Backend (Server):**
- Your deployed URL: `________________________________`

**Update this in App.tsx:** ☝️

## Post-Deployment
- [ ] Test with multiple devices
- [ ] Monitor server logs
- [ ] Check for any errors
- [ ] Share viewer link with team

## 🎉 Done!
Your Atmos CCTV streaming system is live!

---

## Quick Commands

### Deploy Frontend (GitHub Pages)
```bash
git add .
git commit -m "Deploy updates"
git push origin main
```
GitHub Actions will auto-deploy!

### Check Deployment Status
- GitHub Actions: `https://github.com/[username]/Atmos/actions`
- Render Dashboard: `https://dashboard.render.com/`

### View Logs
- Render: Check service logs in dashboard
- Vercel: `vercel logs`
- GitHub Pages: Check Actions tab

---

## Need Help?
- Check `DEPLOYMENT.md` for detailed instructions
- Review server logs for errors
- Test locally first: `node server.js`
