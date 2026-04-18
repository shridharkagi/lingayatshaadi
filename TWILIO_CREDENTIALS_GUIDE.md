# How to Find Twilio Credentials (Free Account)

## 🎯 Quick Answer

After signing up for Twilio, you'll find your credentials on the **Console Dashboard** homepage.

---

## 📝 Step-by-Step Guide

### Step 1: Sign Up for Twilio Free Trial

1. Go to https://www.twilio.com/try-twilio
2. Click **"Sign up and start building"**
3. Fill in the form:
   - Email
   - First & Last Name
   - Password
4. Click **"Start your free trial"**
5. Verify your email address (check inbox)
6. Verify your phone number (they'll send you an OTP)

✅ **You'll get $15 free credit!**

---

### Step 2: Find Account SID and Auth Token

After signup, you'll land on the **Twilio Console Dashboard**.

#### Location: Top Section of Dashboard

You'll see a box titled **"Account Info"** with:

```
Account SID
[copy from Twilio Console]
[Show] [Copy]

Auth Token  
[Hidden] [Show] [Copy]
```

#### To Find Them:

1. **Account SID**:
   - Visible by default
   - Copy the full value shown in Twilio Console
   - Click the **Copy** icon to copy it

2. **Auth Token**:
   - Hidden by default (shows as dots: ••••••••)
   - Click **"Show"** to reveal it
   - Click the **Copy** icon to copy it
   - Starts with a random string

#### Alternative Way:
- Click on **"Account"** in the left sidebar
- Then click **"Account Info"**
- You'll see the same credentials

---

### Step 3: Get a Twilio Phone Number

You need a phone number to send SMS from.

#### Option A: Trial Phone Number (Free)

When you first sign up, Twilio gives you a **trial phone number** automatically.

**To find it:**
1. Look for a section on the dashboard that says **"Get a Trial Number"** or **"Trial Phone Number"**
2. Click **"Get a trial number"**
3. Twilio will assign you a number (usually US number: +1...)
4. Click **"Choose this number"**

**Your trial number will look like:**
```
+1 234 567 8901
```

#### Option B: Buy a Phone Number (Recommended for India)

For better SMS delivery in India, get an India number:

1. In left sidebar, click **"Phone Numbers"** → **"Manage"** → **"Buy a number"**
2. In the search box:
   - **Country**: Select **"India"**
   - **Capabilities**: Check **"SMS"**
3. Click **"Search"**
4. You'll see available numbers like:
   ```
   +91 12345 67890
   ₹84.60/month
   ```
5. Click **"Buy"** on any number
6. Confirm the purchase

**Note:** India numbers cost ~₹85/month, but trial credit covers it!

---

### Step 4: Copy All Three Values

You should now have:

```
Account SID: [copy from Twilio Console]
Auth Token: [copy from Twilio Console]
Phone Number: +11234567890  (or +911234567890 for India)
```

---

## 🔌 Step 5: Add to Supabase

Now go to your Supabase Dashboard:

1. Open https://supabase.com
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **"Phone"** and toggle it **ON**
5. Scroll down to **"SMS Provider Settings"**
6. Select **"Twilio"** from dropdown
7. Fill in the form:

```
Twilio Account SID: 
[Paste your Account SID here]

Twilio Auth Token:
[Paste your Auth Token here]

Twilio Message Service SID (Optional):
[Leave empty for now]

Twilio Phone Number:
[Paste your phone number in E.164 format]
Example: +11234567890 or +911234567890
```

8. Click **"Save"**

---

## 🧪 Test Your Setup

### Send a Test SMS from Twilio Console

1. In Twilio Console, go to **"Messaging"** → **"Try it out"** → **"Send an SMS"**
2. Enter:
   - **From**: Your Twilio number
   - **To**: Your personal phone number (+919876543210)
   - **Message**: "Test message"
3. Click **"Send"**
4. Check your phone - you should receive the SMS!

### Test from Your App

```bash
npm run dev
```

1. Go to http://localhost:3000/login
2. Click **"Mobile OTP"** tab
3. Enter your phone number
4. Click **"Send OTP"**
5. Check your phone for the SMS with 6-digit code
6. Enter the code → Should login successfully!

---

## ⚠️ Trial Account Limitations

### What Works:
✅ Send SMS to **verified phone numbers only**
✅ $15 free credit (~2000 SMS in India)
✅ Full API access

### What Doesn't Work:
❌ Cannot send to unverified numbers
❌ SMS will have prefix: "Sent from your Twilio trial account - "

### How to Verify Phone Numbers (Trial):

1. Go to **"Phone Numbers"** → **"Manage"** → **"Verified Caller IDs"**
2. Click **"Add a new Caller ID"**
3. Enter the phone number you want to test with
4. Twilio will send verification code
5. Enter the code
6. Now you can send OTPs to this number!

---

## 💰 Upgrade to Paid Account

To send SMS to **any** phone number (remove trial restrictions):

1. Go to **"Account"** → **"Billing"**
2. Click **"Upgrade"**
3. Add payment method (credit/debit card)
4. Add funds (minimum ₹750 / $10)
5. You're now upgraded! 🎉

**Benefits:**
- Send to any phone number
- No "trial account" prefix in SMS
- Lower rates
- Professional appearance

---

## 📸 Visual Reference

### Dashboard Layout:

```
┌─────────────────────────────────────────────┐
│  TWILIO CONSOLE                     [User]  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Account Info                        │   │
│  │                                     │   │
│  │ Account SID                         │   │
│  │ AC1234567890abcdef... [Show] [Copy]│   │
│  │                                     │   │
│  │ Auth Token                          │   │
│  │ •••••••••••••••••  [Show] [Copy]   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Trial Number                        │   │
│  │ +1 234 567 8901                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔗 Direct Links

- **Console Dashboard**: https://console.twilio.com/
- **Account Info**: https://console.twilio.com/account
- **Buy Phone Numbers**: https://console.twilio.com/phone-numbers/search
- **Verified Caller IDs**: https://console.twilio.com/phone-numbers/verified

---

## ❓ FAQ

### Q: I can't find the Account SID?
**A:** It's on the main dashboard when you first login. Starts with `AC...`

### Q: Where is Auth Token?
**A:** Same place as Account SID, but click "Show" first to reveal it.

### Q: I don't see "Get a Trial Number"?
**A:** You may already have one assigned. Check "Phone Numbers" → "Manage" → "Active Numbers"

### Q: Can I use a US number to send SMS to India?
**A:** Yes, but India numbers are better for delivery rates and lower cost.

### Q: How much does SMS cost?
**A:** 
- India SMS: ~₹0.60 per message
- US SMS: ~₹0.60 per message
- Your $15 credit = ~2000 SMS

### Q: What format should the phone number be?
**A:** E.164 format with country code:
- India: `+911234567890`
- US: `+11234567890`
- UK: `+441234567890`

---

## ✅ Quick Checklist

- [ ] Signed up for Twilio (got $15 credit)
- [ ] Verified email and phone
- [ ] Found Account SID on dashboard
- [ ] Revealed and copied Auth Token
- [ ] Got trial phone number OR bought India number
- [ ] Added all three values to Supabase
- [ ] Tested SMS from Twilio console
- [ ] Verified test phone numbers (if using trial)
- [ ] Tested OTP login from app

---

## 🎉 You're Done!

Once you have these three values in Supabase, your mobile OTP authentication will work!

**Need Help?**
- Twilio Support: https://support.twilio.com/
- Supabase Docs: https://supabase.com/docs/guides/auth/phone-login
