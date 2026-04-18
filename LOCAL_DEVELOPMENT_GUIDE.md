# Local Development Setup - Production Mode

## Quick Start

Run this command to start your local development server:

```bash
npm run dev:prod
```

Access your app at: **http://localhost:3002**

---

## Development Workflow

### First Time Setup
1. Make sure dependencies are installed:
   ```bash
   npm install
   ```

2. Ensure `.env.local` exists with your Supabase credentials:
   ```bash
   cp .env.example .env.local
   ```

### Daily Development

1. **Start the server:**
   ```bash
   npm run dev:prod
   ```
   This will:
   - Build your app (takes ~30-60 seconds)
   - Start production server on port 3002
   - All clicks will work perfectly

2. **Make code changes**
   - Edit any files you want
   - Save your changes

3. **See your changes:**
   ```bash
   # Stop the server (Ctrl+C)
   # Then rebuild and restart:
   npm run dev:prod
   ```

4. **Quick rebuild (after stopping server):**
   ```bash
   npm run build && PORT=3002 npm start
   ```

---

## Available Commands

```bash
# Production mode (use this for development)
npm run dev:prod              # Build + start on port 3002

# Traditional dev mode (clicks won't work due to Turbopack bug)
npm run dev                   # Start on port 3000 (not recommended)

# Manual production workflow
npm run build                 # Build only
PORT=3002 npm start           # Start production server

# Other commands
npm run lint                  # Check code quality
npm run build                 # Production build for deployment
```

---

## Port Reference

- **Port 3002** - Production mode (recommended, clicks work)
- **Port 3000** - Dev mode (not recommended, clicks broken)
- **Port 3001** - Alternative dev mode (if 3000 is busy)

---

## Tips for Faster Development

### 1. Keep the server running
If you're making small CSS/text changes, you can often test without rebuilding:
- The production build caches assets
- Only rebuild when you change functionality

### 2. Use browser DevTools
- Open DevTools (F12)
- Disable cache in Network tab
- Hard refresh (Cmd+Shift+R) after changes

### 3. Test multiple changes at once
Instead of rebuilding after every change:
- Make several changes
- Rebuild once
- Test all changes together

### 4. Watch build time
First build: ~60 seconds
Subsequent builds: ~30 seconds (cached)

---

## Troubleshooting

### Port 3002 already in use
```bash
# Find and kill the process
lsof -ti:3002 | xargs kill -9

# Or use a different port
PORT=3003 npm start
```

### Build fails
```bash
# Clean build artifacts
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try building again
npm run build
```

### Changes not showing up
```bash
# Hard refresh browser (Cmd+Shift+R)
# Or clear browser cache completely
```

### Still seeing click issues
If clicks don't work on port 3002, check:
1. You're accessing `localhost:3002` (not 3000)
2. Browser cache is cleared
3. You're not in dev mode (`npm run dev`)

---

## Why This Works

**Production mode uses Webpack bundler:**
- ✅ No Turbopack bugs
- ✅ All click events work
- ✅ Identical to deployed production
- ✅ Stable and reliable

**Dev mode uses Turbopack:**
- ❌ Click events broken on your system
- ❌ Aggressive caching issues
- ❌ Not recommended until Next.js fixes

---

## When to Use What

### Use Production Mode (`npm run dev:prod`)
- ✅ Regular development work
- ✅ Testing features
- ✅ Before committing code
- ✅ When clicks need to work

### Use Dev Mode (`npm run dev`)
- ⚠️ Only if you don't need clicks to work
- ⚠️ For quick CSS experiments
- ⚠️ When you need instant hot reload

---

## Deployment

Your production deployment is unchanged:

```bash
# Deploy to Vercel/Netlify
git push

# They automatically run:
npm run build
npm start
```

Everything works perfectly in production! 🚀

---

## Summary

**Your new development command:**
```bash
npm run dev:prod
```

**Access your app:**
```
http://localhost:3002
```

**All features work:**
- ✅ Mobile OTP tab
- ✅ Email tab
- ✅ Hamburger menu
- ✅ Floating buttons
- ✅ All clicks and interactions

---

**Last Updated:** March 2, 2026
**Status:** ✅ Working perfectly
