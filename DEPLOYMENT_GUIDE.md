# Deployment Guide - Social Media Preview Fix

## Problem Summary

Social media platforms (WhatsApp, Facebook, Instagram, etc.) cannot show preview images for your profile links because:

1. **Site is not deployed** - Social media crawlers need a publicly accessible URL (not localhost)
2. **OG image was too large** - 6.8MB is too large; social media recommends <300KB
3. **Image dimensions were wrong** - 2848x1504px instead of recommended 1200x630px

## ✅ Changes Made

### 1. Optimized OG Image
- **Before**: 6.5MB PNG (2848x1504px)
- **After**: 265KB JPG (1200x630px)
- **Files**:
  - `public/og-image.jpg` - New optimized image
  - `public/og-image-original.png` - Backup of original
  - `public/og-image-backup.png` - Backup copy

### 2. Updated Code References
- `src/app/layout.tsx` - Updated to use `/og-image.jpg`
- `src/app/(app)/profile/[id]/layout.tsx` - Updated fallback to `/og-image.jpg`

## 🚀 Next Steps: Deploy Your Site

### Option 1: Deploy to Vercel (Recommended for Next.js)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Deploy from your project directory**:
   ```bash
   cd "/Users/shridharkagi/Desktop/Shridhar's Tasks/Sk/LS/test.ligayatshaadi.in"
   vercel
   ```

3. **Follow the prompts**:
   - Link to existing project or create new one
   - Vercel will detect Next.js automatically
   - Deploy to production: `vercel --prod`

4. **Configure Custom Domain**:
   - Go to Vercel Dashboard → Your Project → Settings → Domains
   - Add `test.ligayatshaadi.in`
   - Update your DNS records as instructed by Vercel

### Option 2: Deploy to Netlify

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Build and deploy**:
   ```bash
   npm run build
   netlify deploy --prod
   ```

3. **Configure domain** in Netlify dashboard

### Option 3: Deploy to Your Own Server

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Upload to server**:
   - Upload `.next` folder, `public` folder, `package.json`, `next.config.js`
   - Run `npm install --production` on server
   - Start with `npm start`

3. **Configure Nginx/Apache** to point `test.ligayatshaadi.in` to your app

## 🔧 Environment Variables

Make sure these are set in your production environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
# Add any other environment variables your app needs
```

## 🧪 Testing After Deployment

### 1. Verify Site is Live
```bash
curl -I https://test.ligayatshaadi.in
```
Should return `HTTP/2 200`

### 2. Check OG Image is Accessible
```bash
curl -I https://test.ligayatshaadi.in/og-image.jpg
```
Should return `HTTP/2 200` and `Content-Type: image/jpeg`

### 3. Test OG Meta Tags
Visit: `https://www.opengraph.xyz/?url=https://test.ligayatshaadi.in/profile/YOUR_PROFILE_ID`

This will show you exactly what social media platforms see.

### 4. Clear Social Media Cache

After deployment, social media platforms cache the OG data. You need to force them to refresh:

#### WhatsApp
1. Visit: https://developers.facebook.com/tools/debug/
2. Enter your URL: `https://test.ligayatshaadi.in/profile/ls26010003-rahul`
3. Click "Debug" then "Scrape Again"
4. This clears WhatsApp cache (WhatsApp uses Facebook's crawler)

#### Facebook
Same as WhatsApp - use the Facebook Debugger tool above

#### Instagram
- Instagram uses Facebook's crawler, so clearing Facebook cache clears Instagram cache

#### LinkedIn
1. Visit: https://www.linkedin.com/post-inspector/
2. Enter your URL
3. Click "Inspect"

#### Twitter/X
1. Visit: https://cards-dev.twitter.com/validator
2. Enter your URL
3. Click "Preview card"

## 📋 Verification Checklist

After deployment, verify each item:

- [ ] Site is accessible at `https://test.ligayatshaadi.in`
- [ ] OG image loads: `https://test.ligayatshaadi.in/og-image.jpg`
- [ ] Profile pages load: `https://test.ligayatshaadi.in/profile/[id]`
- [ ] View page source and confirm OG meta tags are present:
  ```html
  <meta property="og:image" content="https://test.ligayatshaadi.in/og-image.jpg">
  <meta property="og:type" content="profile">
  <meta property="og:url" content="https://test.ligayatshaadi.in/profile/[id]">
  ```
- [ ] Test with OpenGraph.xyz validator
- [ ] Clear cache on Facebook Debugger
- [ ] Share test link on WhatsApp - preview should appear
- [ ] Share on Facebook - preview should appear
- [ ] Share on Instagram DM - preview should appear

## 🐛 Troubleshooting

### Preview still not showing?

1. **Wait 24-48 hours** - Social media platforms cache aggressively
2. **Force clear cache** - Use the debugger tools above
3. **Check image format** - Must be JPG or PNG, <300KB
4. **Verify HTTPS** - Social media requires secure connections
5. **Check response headers**:
   ```bash
   curl -I https://test.ligayatshaadi.in/og-image.jpg
   ```
   Should include: `Content-Type: image/jpeg`

### Image shows but is wrong/old?

- Clear the specific social media platform's cache using the tools above
- Wait 10-15 minutes after clearing cache
- Try sharing a different URL parameter: `?v=2` to force refresh

### Still not working?

Check if meta tags are actually in the HTML:
```bash
curl https://test.ligayatshaadi.in/profile/ls26010003-rahul | grep "og:image"
```

If you don't see the OG tags, there might be an issue with:
- Server-side rendering (SSR) in Next.js
- Environment variables not set
- Build process

## 📚 Additional Resources

- [Open Graph Protocol](https://ogp.me/)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Next.js Metadata Documentation](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Vercel Deployment Docs](https://vercel.com/docs)

## 💡 Tips for Future

1. **Test OG images before deploying** - Use OpenGraph.xyz locally
2. **Keep images optimized** - <300KB, 1200x630px
3. **Use absolute URLs** - Always include full domain in OG image URLs
4. **Clear cache after updates** - Always use debugger tools after deploying changes
5. **Monitor with tools** - Regularly check with validators to ensure OG tags work

## 🎯 Expected Results

Once deployed and cache is cleared, when you share a profile link like:
```
https://test.ligayatshaadi.in/profile/ls26010003-rahul
```

**WhatsApp/Facebook/Instagram will show**:
- Profile photo (if available) or site OG image
- Profile name and age
- Description with profession and location
- "LingayatShaadi" as the site name

**Preview format**:
```
[Image: Profile Photo or OG Image]
Rahul - 28 yrs, Software Engineer | LingayatShaadi
Rahul - 28 years old, 5'10" tall, Software Engineer from Bangalore, Karnataka...
test.ligayatshaadi.in
```
