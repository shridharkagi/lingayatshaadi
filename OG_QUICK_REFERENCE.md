# Open Graph Images - Quick Reference

## ✅ What's Working Now

Your LingayatBandhu website now has fully functional Open Graph (OG) images!

### When You Share Links:

**Homepage** (`https://test.ligayatshaadi.in`)
- Shows: Professional branded OG image with LingayatBandhu logo
- Title: "LingayatBandhu - Find Your Perfect Match"
- Description: "Premium matrimonial platform for the Lingayat community"

**Profile Pages** (`https://test.ligayatshaadi.in/profile/LS26010001`)
- Shows: Profile photo (or default OG image if no photo)
- Title: "{Name} - {Age} yrs, {Profession} | LingayatBandhu"
- Description: Full profile details including location, education, etc.

## 🧪 How to Test

### Option 1: Built-in Test Page
```
1. Start your dev server: npm run dev
2. Visit: http://localhost:3000/og-test
3. Test any URL on your site
```

### Option 2: Run Verification Script
```bash
./verify-og-setup.sh
```

### Option 3: External Validators
- Facebook: https://developers.facebook.com/tools/debug/
- Twitter: https://cards-dev.twitter.com/validator
- OpenGraph: https://www.opengraph.xyz/

## 📁 What Was Created

```
✅ lingayat-shaadi/public/og-image.png                    (6.5MB, 1200x630px)
✅ lingayat-shaadi/src/app/layout.tsx                     (Updated with OG metadata)
✅ lingayat-shaadi/src/app/(app)/profile/[id]/layout.tsx  (New - Dynamic OG for profiles)
✅ lingayat-shaadi/src/app/og-test/page.tsx              (New - Testing interface)
✅ lingayat-shaadi/OG_IMAGES_SETUP.md                     (Detailed documentation)
✅ lingayat-shaadi/OG_IMPLEMENTATION_SUMMARY.md           (Implementation summary)
✅ verify-og-setup.sh                                     (Verification script)
```

## 🚀 Quick Commands

```bash
# Verify OG setup
./verify-og-setup.sh

# Start dev server
cd lingayat-shaadi && npm run dev

# Test OG tags (after server is running)
# Visit: http://localhost:3000/og-test

# Check if OG image exists
ls -lh lingayat-shaadi/public/og-image.png
```

## 🔧 Need to Update Something?

### Change the Default OG Image
```bash
# Replace this file:
lingayat-shaadi/public/og-image.png

# Image requirements:
# - Dimensions: 1200x630 pixels
# - Format: PNG or JPG
# - Max size: 8MB (recommended: under 1MB)
```

### Change the Site URL (for production)
```typescript
// Update in: lingayat-shaadi/src/app/layout.tsx
metadataBase: new URL("https://your-production-url.com")

// Update in: lingayat-shaadi/src/app/(app)/profile/[id]/layout.tsx
const profileUrl = `https://your-production-url.com/profile/${params.id}`;
```

## 🎯 What Platforms Are Supported?

✅ Facebook
✅ Twitter/X  
✅ LinkedIn
✅ WhatsApp
✅ Telegram
✅ Discord
✅ Slack
✅ iMessage
✅ Email previews

## 📊 Technical Details

### OG Tags Configured

```html
<!-- Main Site -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://test.ligayatshaadi.in" />
<meta property="og:title" content="LingayatBandhu - Find Your Perfect Match" />
<meta property="og:description" content="Premium matrimonial platform..." />
<meta property="og:image" content="https://test.ligayatshaadi.in/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="LingayatBandhu" />
<meta property="og:locale" content="en_US" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="LingayatBandhu - Find Your Perfect Match" />
<meta name="twitter:description" content="Premium matrimonial platform..." />
<meta name="twitter:image" content="https://test.ligayatshaadi.in/og-image.png" />
```

### Profile Pages (Dynamic)
Each profile page automatically generates its own OG tags with:
- Profile photo as the image
- Profile name, age, and profession in title
- Full profile details in description

## 🐛 Troubleshooting

### "Image not showing when I share"
1. Clear social media cache using Facebook Debugger
2. Wait 5-10 minutes (platforms cache OG images)
3. Make sure image is publicly accessible
4. Check image size (must be at least 200x200px)

### "Getting old image"
Social media platforms cache OG images for up to 30 days:
- Facebook: Use Sharing Debugger and click "Scrape Again"
- Twitter: Images cached for 7 days
- LinkedIn: Use Post Inspector to refresh

### "Profile images not working"
1. Check Supabase connection
2. Verify profile photos are publicly accessible URLs
3. Check browser console for errors
4. Test with `/og-test` page

## 📖 Full Documentation

For detailed information, see:
- `OG_IMAGES_SETUP.md` - Complete setup guide
- `OG_IMPLEMENTATION_SUMMARY.md` - Implementation details

## 💡 Pro Tips

1. **Always test before deploying**
   - Use the `/og-test` page
   - Test on multiple platforms
   - Check on mobile devices

2. **Keep images optimized**
   - Use tools like TinyPNG to compress
   - Aim for under 1MB file size
   - Maintain 1200x630 dimensions

3. **Update regularly**
   - Refresh OG images seasonally
   - Update for special events
   - Keep branding consistent

4. **Monitor performance**
   - Check social media analytics
   - Track click-through rates
   - A/B test different images

## ✨ Success!

Your OG images are now working! When anyone shares your website on social media, they'll see beautiful, branded preview cards with images, titles, and descriptions.

---

**Need Help?**
- Check the full documentation in `OG_IMAGES_SETUP.md`
- Run `./verify-og-setup.sh` to verify setup
- Visit `/og-test` to test your OG tags
- Use Facebook Debugger to see how links appear

**Questions?**
All implementation details are in `OG_IMPLEMENTATION_SUMMARY.md`
