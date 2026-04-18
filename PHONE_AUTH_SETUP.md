# Supabase Phone/SMS Authentication Setup Guide

## Overview
This guide explains how to enable phone/SMS authentication in Supabase for the LingayatShaadi app.

---

## ⚡ Quick walkthrough (Twilio)

1. **Twilio account** – Sign up at [twilio.com](https://www.twilio.com/) (≈ $15 trial credit)
2. **Get credentials** – Dashboard → Account SID, Auth Token
3. **Buy number** – Phone Numbers → Manage → Buy a number → India (+91) → Enable SMS
4. **Supabase** – Authentication → Providers → Phone → ON
5. **Provider** – Select Twilio, paste Account SID, Auth Token, Twilio phone number
6. **Test** – App → Login → Mobile OTP tab → Enter phone → Send OTP

---

## 📋 Prerequisites
- Supabase project created
- SMS provider account (Twilio, MessageBird, Vonage, or Textlocal)

---

## 🔧 Step 1: Choose an SMS Provider

Supabase supports multiple SMS providers:

### Option 1: Twilio (Recommended - Most Popular)
- **Pros**: Reliable, good documentation, works globally
- **Pricing**: Pay-as-you-go, ~$0.0075 per SMS in India
- **Setup**: https://www.twilio.com/

### Option 2: MessageBird
- **Pros**: Good for Europe/Asia, competitive pricing
- **Pricing**: Similar to Twilio
- **Setup**: https://www.messagebird.com/

### Option 3: Vonage (formerly Nexmo)
- **Pros**: Good API, reliable
- **Pricing**: Pay-as-you-go
- **Setup**: https://www.vonage.com/

### Option 4: Textlocal (Good for India)
- **Pros**: India-focused, good for local numbers
- **Pricing**: Bulk SMS packages available
- **Setup**: https://www.textlocal.in/

---

## 📱 Step 2: Configure Twilio (Example)

### 2.1 Create Twilio Account
1. Go to https://www.twilio.com/
2. Sign up for a free trial account
3. Verify your email and phone number
4. Get **$15 free credit** for testing

### 2.2 Get Twilio Credentials
After signing up, you'll need:
- **Account SID** (found on dashboard)
- **Auth Token** (found on dashboard)
- **Phone Number** (get a Twilio number)

To get a phone number:
1. Go to **Phone Numbers** → **Manage** → **Buy a number**
2. Select country: **India (+91)**
3. Check "SMS" capability
4. Purchase number (~₹85/month for India numbers)

---

## 🔌 Step 3: Configure Supabase

### 3.1 Navigate to Phone Auth Settings
1. Open your Supabase Dashboard
2. Go to **Authentication** → **Providers**
3. Find **Phone** in the list
4. Toggle it **ON**

### 3.2 Add SMS Provider Credentials

For **Twilio**:
```
Provider: Twilio
Twilio Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Twilio Auth Token: your_auth_token_here
Twilio Phone Number: +1234567890 (your Twilio number)
```

For **MessageBird**:
```
Provider: MessageBird
MessageBird API Key: your_api_key_here
MessageBird Originator: your_sender_name_or_number
```

### 3.3 Configure SMS Template (Optional)
Customize the OTP message:
```
Your LingayatShaadi verification code is: {{ .Token }}
```

Default template works fine:
```
Your code is {{ .Token }}
```

---

## 🧪 Step 4: Test Phone Authentication

### 4.1 Test with Supabase Dashboard
1. Go to **Authentication** → **Users**
2. Click **Add User** → **Phone**
3. Enter a test phone number: `+919876543210`
4. Supabase will send an OTP
5. Check if SMS is received

### 4.2 Test with Your App
```bash
npm run dev
```

1. Navigate to `/login`
2. Click **Mobile OTP** tab
3. Enter your phone number (without +91)
4. Click **Send OTP**
5. Check your phone for the SMS
6. Enter the 6-digit code
7. Should redirect to `/home`

---

## 💰 Cost Estimates

### Development/Testing (100 OTPs/month)
- **Twilio**: ~₹60/month ($0.75)
- **MessageBird**: ~₹50/month
- **Textlocal**: ~₹50/month

### Production (1000 users signing up)
- **Twilio**: ~₹600 ($7.50)
- **MessageBird**: ~₹500
- **Textlocal**: Bulk packages available

---

## 🔒 Security Best Practices

### Rate Limiting
Supabase automatically rate limits OTP requests:
- Max 3-5 OTPs per phone number per hour
- Prevents spam and abuse

### Phone Number Validation
- Always validate phone number format
- Use E.164 format: `+919876543210`
- Our app adds `+91` automatically

### Test Numbers
For development, use Twilio test credentials:
```
Test Phone Number: +15005550006
This will always succeed without sending real SMS
```

---

## 🚨 Troubleshooting

### SMS Not Received
1. **Check credits**: Ensure your SMS provider has credits
2. **Check number format**: Must be E.164 format (+919876543210)
3. **Check provider logs**: View delivery status in Twilio/MessageBird dashboard
4. **Check spam folder**: Some carriers filter OTPs
5. **Try different number**: Some numbers may be blocked by carriers

### "Invalid credentials" Error
- Double-check Account SID and Auth Token
- Make sure Twilio phone number is correct
- Verify phone number in Twilio console

### "Rate limit exceeded"
- Wait 1 hour before requesting new OTP
- Use different phone number for testing
- Configure rate limits in Supabase dashboard

---

## 🌍 International Phone Numbers

Currently configured for **India (+91)**. To support other countries:

### In Login Page (`src/app/login/page.tsx`)
```typescript
// Change this line:
const phone = `+91${mobile.replace(/\D/g, "")}`;

// To support multiple countries:
const phone = `${countryCode}${mobile.replace(/\D/g, "")}`;
```

### Add Country Code Selector
Add a dropdown to select country code:
- +91 (India)
- +1 (USA/Canada)
- +44 (UK)
- +971 (UAE)
- etc.

---

## 📊 Monitoring

### View SMS Logs
1. **Twilio Console**: View all SMS sent, delivery status
2. **Supabase Logs**: View auth attempts
3. **Supabase Analytics**: Track phone signups

### Important Metrics
- SMS delivery rate
- Failed OTP attempts
- Cost per user

---

## ✅ Checklist

Before going to production:

- [ ] SMS provider account created and verified
- [ ] Phone number purchased (if required)
- [ ] Supabase phone auth enabled
- [ ] SMS provider credentials added to Supabase
- [ ] Tested with real phone numbers
- [ ] Rate limiting configured
- [ ] SMS template customized with branding
- [ ] Budget/credits allocated for SMS costs
- [ ] Monitoring and logging set up
- [ ] Error handling tested

---

## 🔗 Useful Links

- [Supabase Phone Auth Docs](https://supabase.com/docs/guides/auth/phone-login)
- [Twilio Console](https://console.twilio.com/)
- [MessageBird Dashboard](https://dashboard.messagebird.com/)
- [Textlocal India](https://www.textlocal.in/)

---

## 💡 Alternative: Email-Only Authentication

If SMS costs are too high, you can:
1. Keep only email authentication enabled
2. Use email as primary login method
3. Phone number becomes optional profile field
4. Saves ~₹5-10 per user signup

Current implementation supports **both email and phone OTP**!
