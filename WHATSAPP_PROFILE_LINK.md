# WhatsApp Contact Float - Profile Link Integration

## Implementation Summary

The floating contact button now automatically includes the profile link in the WhatsApp message when users are viewing profile pages.

## How It Works

### On Profile Pages
When a user is on a profile page (e.g., `/profile/ls26010003-rahul`), clicking the WhatsApp button will open WhatsApp with the following pre-filled message:

```
I need more information about the profile http://localhost:3000/profile/ls26010003-rahul.

My name is: 
```

### On Other Pages
On any other page (homepage, search, etc.), the default message is used:
```
I need assistance, my name: 
```

## Updated Files

### 1. lingayat-shaadi/src/components/ui/ContactFloat.tsx
- Added `usePathname` hook from Next.js to detect current route
- Added `useEffect` to dynamically generate WhatsApp URL based on current page
- Checks if pathname starts with `/profile/` (excluding `/profile/complete`)
- Includes full URL in the message when on profile pages

### 2. src/components/ui/ContactFloat.tsx
- Same changes applied for consistency

## Technical Implementation

```typescript
// Detect current pathname
const pathname = usePathname();

// Update WhatsApp URL based on current page
useEffect(() => {
  if (!whatsappNumber) return;

  let message = "";
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  // Check if we're on a profile page
  if (pathname && pathname.startsWith("/profile/") && pathname !== "/profile/complete") {
    message = `I need more information about the profile ${currentUrl}.\n\nMy name is: `;
  } else {
    message = config.whatsappDefaultMessage || "I need assistance, my name: ";
  }

  setWhatsappUrl(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`);
}, [pathname, whatsappNumber, config.whatsappDefaultMessage]);
```

## Message Format

### Profile Page Message
```
I need more information about the profile [Full URL].

My name is: 
```

**Example:**
```
I need more information about the profile http://localhost:3000/profile/ls26010003-rahul.

My name is: 
```

### Default Message
```
I need assistance, my name: 
```

## Testing

### Test Scenarios

1. **Profile Page - LS26010003**
   - URL: `http://localhost:3000/profile/ls26010003-rahul`
   - Expected Message: `I need more information about the profile http://localhost:3000/profile/ls26010003-rahul.\n\nMy name is: `

2. **Profile Page - LS26010002**
   - URL: `http://localhost:3000/profile/ls26010002-priya`
   - Expected Message: `I need more information about the profile http://localhost:3000/profile/ls26010002-priya.\n\nMy name is: `

3. **Homepage**
   - URL: `http://localhost:3000/`
   - Expected Message: `I need assistance, my name: `

4. **Profile Complete Page (Excluded)**
   - URL: `http://localhost:3000/profile/complete`
   - Expected Message: `I need assistance, my name: ` (default message)

### Manual Testing Steps

1. Start the development server:
   ```bash
   cd lingayat-shaadi
   npm run dev
   ```

2. Navigate to a profile page:
   ```
   http://localhost:3000/profile/ls26010003-rahul
   ```

3. Click the floating contact button (bottom right)

4. Click "WhatsApp Us" in the popup modal

5. Verify the WhatsApp message includes the profile URL

### Testing with Different Profiles

The message will automatically adapt to any profile URL:
- `/profile/ls26010001-anjali` → Includes this URL
- `/profile/ls26010005-vikram` → Includes this URL
- `/profile/any-slug` → Includes this URL

## Features

✅ Automatically detects profile pages
✅ Includes full profile URL in WhatsApp message
✅ Works with any profile slug format
✅ Maintains user-friendly message format
✅ Falls back to default message on non-profile pages
✅ Excludes `/profile/complete` page (not a profile view)
✅ Updates dynamically when navigating between pages

## User Flow

1. User browses profiles
2. User finds interesting profile (e.g., Rahul - LS26010003)
3. User clicks floating contact button
4. Modal opens with "Call Us" and "WhatsApp Us" options
5. User clicks "WhatsApp Us"
6. WhatsApp opens with pre-filled message including:
   - Profile link
   - Request for more information
   - Prompt for user to add their name

## Message Structure Breakdown

```
I need more information about the profile [URL].
                                         ^^^^^^ - Full clickable link in WhatsApp

My name is: 
           ^ - Cursor position for user to type their name
```

## Benefits

1. **Context Preservation**: Support team knows exactly which profile the inquiry is about
2. **Easy Reference**: Clickable link to profile in WhatsApp chat
3. **Better Support**: Support can view the profile before responding
4. **User Convenience**: User doesn't need to explain which profile they're asking about
5. **Professional**: Structured message format looks professional

## Production Considerations

When deployed to production:
- Development URL: `http://localhost:3000/profile/ls26010003-rahul`
- Production URL: `https://test.ligayatshaadi.in/profile/ls26010003-rahul`

The URL will automatically update based on the environment (uses `window.location.href`).

## Configuration

No additional configuration needed! The feature works automatically by:
1. Detecting the current pathname
2. Checking if it's a profile page
3. Using the full URL from the browser

## Compatibility

- ✅ Desktop browsers
- ✅ Mobile browsers
- ✅ WhatsApp Web
- ✅ WhatsApp Mobile App
- ✅ All profile slug formats

## Edge Cases Handled

1. **Profile Complete Page**: Excluded (not a profile view page)
2. **No WhatsApp Number**: Component doesn't render
3. **Navigation**: URL updates when user navigates to different profiles
4. **Server-Side Rendering**: Uses `window.location.href` only on client side

## Future Enhancements (Optional)

- Add profile name to the message (e.g., "I need information about Rahul's profile")
- Include member ID in the message
- Add profile details summary in the message
- Allow admin to customize the message template

## Support

If the WhatsApp link doesn't include the profile URL:
1. Check that `usePathname` is properly imported from `next/navigation`
2. Verify pathname detection in browser console
3. Ensure WhatsApp number is configured in app settings
4. Check that you're on a profile page (URL starts with `/profile/`)

## Code Changes Summary

**Before:**
```typescript
const whatsappMessage = (config.whatsappDefaultMessage || "I need assistance, my name: ").trim();
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
```

**After:**
```typescript
const pathname = usePathname();
const [whatsappUrl, setWhatsappUrl] = useState("");

useEffect(() => {
  let message = "";
  const currentUrl = window.location.href;
  
  if (pathname?.startsWith("/profile/") && pathname !== "/profile/complete") {
    message = `I need more information about the profile ${currentUrl}.\n\nMy name is: `;
  } else {
    message = config.whatsappDefaultMessage || "I need assistance, my name: ";
  }
  
  setWhatsappUrl(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`);
}, [pathname, whatsappNumber, config.whatsappDefaultMessage]);
```

## Result

Now when users inquire about a specific profile via WhatsApp, the support team receives a message with:
1. Clear indication of which profile the user is interested in
2. Clickable link to view the profile
3. User's name (typed by the user)

This improves support efficiency and user experience! 🎉
