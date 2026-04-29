# Open Graph (OG) Images Setup

This document explains how Open Graph images are configured in the LingayatBandhu application.

## What are OG Images?

Open Graph images are the preview images that appear when you share a link on social media platforms like Facebook, Twitter, LinkedIn, WhatsApp, etc. They help make your links more attractive and increase click-through rates.

## Implementation

### 1. Default OG Image

**Location:** `/lingayat-shaadi/public/og-image.png`

This is the default OG image (1200x630px) that appears when:
- The homepage is shared
- Any page without a specific OG image is shared

**Configured in:** `src/app/layout.tsx`

```typescript
export const metadata: Metadata = {
  title: "LingayatBandhu - Find Your Perfect Match",
  description: seo.description,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://test.ligayatshaadi.in",
    siteName: "LingayatBandhu",
    title: "LingayatBandhu - Find Your Perfect Match",
    description: seo.description,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LingayatBandhu - Premium Matrimonial Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LingayatBandhu - Find Your Perfect Match",
    description: seo.description,
    images: ["/og-image.png"],
  },
  metadataBase: new URL("https://test.ligayatshaadi.in"),
};
```

### 2. Dynamic Profile OG Images

**Location:** `src/app/(app)/profile/[id]/layout.tsx`

Each profile page has its own dynamic OG metadata that includes:
- Profile photo (if available)
- Profile name, age, profession
- Location and education details

The `generateMetadata` function fetches the profile data from Supabase and generates custom OG tags for each profile:

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const publicId = parseProfileSlug(params.id);
  const supabase = createSupabaseClient();
  
  // Fetch profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .or(`public_id.eq.${publicId},member_id.eq.${publicId}`)
    .single();

  // Generate dynamic metadata with profile photo and details
  return {
    title: `${profile.full_name} - ${age} yrs, ${profile.profession} | LingayatBandhu`,
    description: `${profile.full_name} - ${age} years old, ...`,
    openGraph: {
      images: [{ url: profile.profile_photo || "/og-image.png" }],
      // ... other OG tags
    },
  };
}
```

## OG Image Specifications

### Recommended Dimensions
- **Facebook/LinkedIn:** 1200 x 630 pixels
- **Twitter:** 1200 x 628 pixels (or 1200 x 630)
- **Aspect Ratio:** 1.91:1

### File Format
- PNG or JPG
- Max file size: 8MB (but aim for under 1MB for faster loading)

### Safe Zone
Keep important text and visuals within the center 1200 x 600 pixels to avoid cropping on different platforms.

## Testing OG Images

### Test Page
Visit `/og-test` to access the built-in OG image testing tool. This page allows you to:
- Test any URL on the site
- View current meta tags
- Use external validators (Facebook Debugger, Twitter Card Validator)

### External Testing Tools

1. **OpenGraph.xyz**
   - URL: https://www.opengraph.xyz/
   - Quick preview of how your link will appear

2. **Facebook Sharing Debugger**
   - URL: https://developers.facebook.com/tools/debug/
   - Shows Facebook's cached version
   - Click "Scrape Again" to refresh cache

3. **Twitter Card Validator**
   - URL: https://cards-dev.twitter.com/validator
   - Preview how links appear on Twitter

4. **LinkedIn Post Inspector**
   - URL: https://www.linkedin.com/post-inspector/
   - Test how links appear on LinkedIn

### Command Line Testing

You can also test OG tags using curl:

```bash
curl -s "https://test.ligayatshaadi.in" | grep -i "og:"
```

## Troubleshooting

### Image Not Updating

1. **Clear Social Media Cache:**
   - Facebook: Use the Sharing Debugger and click "Scrape Again"
   - Twitter: Cards are cached for 7 days
   - LinkedIn: Use Post Inspector to refresh

2. **Check Image URL:**
   - Ensure the image is publicly accessible
   - Verify the full URL in the meta tags
   - Check that the image file exists in `/public/`

3. **Verify Meta Tags:**
   - Visit `/og-test` to see current meta tags
   - Ensure `metadataBase` is set correctly in layout.tsx

### Image Not Showing

1. **Check Image Size:**
   - Must be at least 200x200 pixels
   - Recommended: 1200x630 pixels

2. **Verify HTTPS:**
   - Most platforms require HTTPS for images
   - Ensure your site is served over HTTPS in production

3. **Check Content-Type:**
   - Image must be served with correct MIME type
   - Next.js handles this automatically for files in `/public/`

## Best Practices

1. **Always Include Alt Text:**
   ```typescript
   images: [
     {
       url: "/og-image.png",
       alt: "Descriptive alt text"
     }
   ]
   ```

2. **Use High-Quality Images:**
   - Clear, professional images
   - High resolution (at least 1200x630)
   - Optimized file size

3. **Include Text in Image:**
   - Make text readable at small sizes
   - Use high contrast
   - Keep it concise

4. **Test on Multiple Platforms:**
   - Different platforms may crop differently
   - Test on Facebook, Twitter, WhatsApp, LinkedIn

5. **Update Regularly:**
   - Keep OG images fresh and relevant
   - Update when branding changes

## Updating OG Images

### To Update the Default OG Image:

1. Create a new image (1200x630px)
2. Replace `/lingayat-shaadi/public/og-image.png`
3. Clear social media caches using the tools above

### To Change Profile OG Images:

Profile OG images are automatically generated from profile photos stored in Supabase. To use a custom OG image for profiles:

1. Edit `src/app/(app)/profile/[id]/layout.tsx`
2. Modify the `generateMetadata` function
3. Update the `images` array in the `openGraph` object

## Additional Resources

- [Open Graph Protocol](https://ogp.me/)
- [Facebook Sharing Best Practices](https://developers.facebook.com/docs/sharing/webmasters/)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
