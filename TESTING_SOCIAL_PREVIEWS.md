# Quick Testing Guide - Social Media Previews

## ✅ Quick Test Script

Run this after deploying to verify everything works:

```bash
#!/bin/bash

# Replace with your actual domain and profile ID
DOMAIN="test.ligayatshaadi.in"
PROFILE_ID="ls26010003-rahul"

echo "🧪 Testing Social Media Preview Setup..."
echo ""

# Test 1: Site is live
echo "1️⃣ Testing if site is live..."
curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}" | grep -q "200" && echo "✅ Site is live" || echo "❌ Site is not accessible"

# Test 2: OG Image is accessible
echo "2️⃣ Testing OG image..."
curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}/og-image.jpg" | grep -q "200" && echo "✅ OG image is accessible" || echo "❌ OG image not found"

# Test 3: Profile page is accessible
echo "3️⃣ Testing profile page..."
curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}/profile/${PROFILE_ID}" | grep -q "200" && echo "✅ Profile page is accessible" || echo "❌ Profile page not accessible"

# Test 4: Check OG meta tags
echo "4️⃣ Checking OG meta tags in HTML..."
curl -s "https://${DOMAIN}/profile/${PROFILE_ID}" | grep -q "og:image" && echo "✅ OG meta tags found" || echo "❌ OG meta tags missing"

echo ""
echo "🌐 Test URLs (open in browser):"
echo "• OpenGraph Validator: https://www.opengraph.xyz/?url=https://${DOMAIN}/profile/${PROFILE_ID}"
echo "• Facebook Debugger: https://developers.facebook.com/tools/debug/?q=https://${DOMAIN}/profile/${PROFILE_ID}"
echo ""
echo "💡 Next steps:"
echo "1. Open the URLs above to validate OG tags"
echo "2. Click 'Scrape Again' in Facebook Debugger to clear cache"
echo "3. Share your profile link on WhatsApp to test"
```

Save this as `test-social-preview.sh`, make it executable, and run:
```bash
chmod +x test-social-preview.sh
./test-social-preview.sh
```

## 🎯 Expected Results When Sharing Links

### ✅ CORRECT - What You Should See

When sharing `https://test.ligayatshaadi.in/profile/ls26010003-rahul` on WhatsApp/Facebook:

```
┌─────────────────────────────────┐
│  [Profile Photo or OG Image]    │
├─────────────────────────────────┤
│ Rahul - 28 yrs, Software        │
│ Engineer | LingayatBandhu        │
│                                  │
│ Rahul - 28 years old, 5'10"     │
│ tall, Software Engineer from     │
│ Bangalore, Karnataka...          │
│                                  │
│ test.ligayatshaadi.in            │
└─────────────────────────────────┘
```

### ❌ INCORRECT - Problems to Look For

**Problem 1: No preview at all**
```
https://test.ligayatshaadi.in/profile/ls26010003-rahul
```
**Cause**: Site not deployed or meta tags missing

**Problem 2: Just text, no image**
```
┌─────────────────────────────────┐
│ Rahul - 28 yrs, Software        │
│ Engineer | LingayatBandhu        │
│ test.ligayatshaadi.in            │
└─────────────────────────────────┘
```
**Cause**: OG image not accessible or wrong URL

**Problem 3: Wrong/old image**
```
┌─────────────────────────────────┐
│  [Old or Different Image]       │
├─────────────────────────────────┤
│ Profile - LingayatBandhu         │
│ test.ligayatshaadi.in            │
└─────────────────────────────────┘
```
**Cause**: Cache not cleared on social media platform

## 🔧 Clear Social Media Cache - Step by Step

### WhatsApp & Facebook (They Share Cache)

1. **Open Facebook Sharing Debugger**:
   - Go to: https://developers.facebook.com/tools/debug/
   
2. **Enter your URL**:
   ```
   https://test.ligayatshaadi.in/profile/ls26010003-rahul
   ```

3. **Click "Debug"**

4. **Review the preview** - You'll see:
   - What image Facebook/WhatsApp will use
   - All OG meta tags
   - Any warnings or errors

5. **Click "Scrape Again"** - This clears the cache

6. **Wait 5 minutes** then try sharing on WhatsApp

### Instagram

- Instagram uses Facebook's cache
- Clear Facebook cache (above) and Instagram will update too

### LinkedIn

1. Go to: https://www.linkedin.com/post-inspector/
2. Enter URL: `https://test.ligayatshaadi.in/profile/ls26010003-rahul`
3. Click "Inspect"

### Twitter/X

1. Go to: https://cards-dev.twitter.com/validator
2. Enter URL: `https://test.ligayatshaadi.in/profile/ls26010003-rahul`
3. Click "Preview card"

## 📱 Manual WhatsApp Test

1. **Send the link to yourself**:
   - Open WhatsApp
   - Send to a test contact or yourself (use WhatsApp Web trick):
     ```
     https://test.ligayatshaadi.in/profile/ls26010003-rahul
     ```

2. **What to check**:
   - ✅ Image loads and is clear
   - ✅ Title shows profile name and age
   - ✅ Description shows profession and location
   - ✅ Domain name appears at bottom

3. **If preview doesn't show**:
   - Wait 30 seconds (WhatsApp fetches preview in background)
   - Clear Facebook cache (see above)
   - Try again in 5 minutes

## 🐛 Troubleshooting Checklist

Work through these in order:

### Step 1: Verify Site is Deployed
```bash
curl -I https://test.ligayatshaadi.in
```
**Expected**: `HTTP/2 200` or `HTTP/1.1 200`
**If error**: Site is not deployed or domain not configured

### Step 2: Verify OG Image Exists
```bash
curl -I https://test.ligayatshaadi.in/og-image.jpg
```
**Expected**: `HTTP/2 200` and `Content-Type: image/jpeg`
**If error**: Image file missing from deployed build

### Step 3: Check Meta Tags in HTML
```bash
curl -s https://test.ligayatshaadi.in/profile/ls26010003-rahul | grep "og:image"
```
**Expected**: Should see line with `<meta property="og:image" content="..."`
**If nothing**: Meta tags not rendering (SSR issue)

### Step 4: Validate with OpenGraph.xyz
1. Go to: https://www.opengraph.xyz/
2. Enter: `https://test.ligayatshaadi.in/profile/ls26010003-rahul`
3. Click "Submit"
**Expected**: Should show image and all meta tags
**If error**: Shows exactly what's wrong

### Step 5: Clear Social Media Cache
- Use Facebook Debugger (covers WhatsApp, FB, Instagram)
- Click "Scrape Again"
- Wait 5 minutes

### Step 6: Test on Actual Platform
- Send link to yourself on WhatsApp
- Wait 30 seconds for preview to load
- If still no preview, repeat Step 5

## ⚡ Quick Reference - Common Issues

| Problem | Solution |
|---------|----------|
| No preview at all | Deploy site first, verify with `curl` |
| No image, just text | Check OG image URL, verify it's accessible |
| Wrong/old image | Clear cache with Facebook Debugger |
| Image too small/pixelated | Image should be 1200x630px |
| Preview works on validator but not WhatsApp | Clear Facebook cache, wait 5 minutes |
| Different preview on different platforms | Clear cache on each platform separately |
| Works on desktop, not mobile | Both use same cache, wait longer |

## 📊 Test Matrix

After deployment, test each profile and platform:

| Profile | WhatsApp | Facebook | Instagram | LinkedIn | Twitter |
|---------|----------|----------|-----------|----------|---------|
| Profile 1 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Profile 2 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Profile 3 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Homepage | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

✅ = Preview shows correctly
❌ = Preview missing or wrong
⬜ = Not tested yet

## 🎓 Understanding the Delay

**Why isn't it instant?**

1. **Social media fetch delay**: 5-30 seconds to fetch metadata
2. **Cache duration**: Facebook/WhatsApp cache for 7 days
3. **CDN propagation**: If using CDN, can take 5-15 minutes
4. **DNS propagation**: If you just configured domain, can take up to 48 hours

**Normal timeline after deployment:**
- ✅ Site accessible: Immediate
- ✅ OG tags in HTML: Immediate
- ✅ Validator shows preview: 1-2 minutes
- ✅ WhatsApp shows preview (first share): 5-10 minutes
- ✅ WhatsApp shows preview (after cache clear): 5 minutes

## 💡 Pro Tips

1. **Test immediately after deploy** - Don't share links to real users until you've verified
2. **Use a test group** - Create a WhatsApp group for testing before sharing widely
3. **Document your profile IDs** - Keep a list of test profile IDs
4. **Bookmark validators** - Save the Facebook Debugger and OpenGraph.xyz links
5. **Schedule cache clears** - After deploying updates, clear cache on all platforms
6. **Monitor regularly** - Check previews weekly to catch any issues

## ✨ Success Criteria

Your social media previews are working correctly when:

✅ **On WhatsApp**:
- Image appears within 30 seconds of sending link
- Image is clear and properly sized
- Profile name, age, and profession are visible
- Domain name shows at bottom

✅ **On Facebook**:
- Rich preview when pasting link
- Image fills the preview box
- All text is readable

✅ **On Instagram DM**:
- Preview appears when sending link
- Image and text are visible

✅ **On Validators**:
- OpenGraph.xyz shows all tags correctly
- Facebook Debugger shows no errors
- All required properties present

## 🚀 Ready to Deploy?

1. ✅ OG image optimized (265KB, 1200x630px)
2. ✅ Code updated to use `/og-image.jpg`
3. ✅ Deployment guide ready
4. ✅ Testing checklist ready

**Next: Follow DEPLOYMENT_GUIDE.md to deploy your site!**
