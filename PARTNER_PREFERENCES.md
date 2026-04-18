Redesign my Partner Preferences form UI for a modern matrimony / matchmaking web app.

Current issue:
The form is too long, too heavy, and uses too many text input fields. It feels like a job application form. I want a premium, modern, conversion-friendly UX that feels easy and quick to complete.

Goal:
Create a clean, responsive, mobile-first Partner Preferences screen with excellent UX.

Design Style:
- Modern matrimony app
- Premium, elegant, clean
- Soft rounded corners
- Spacious but compact
- Professional typography
- Warm neutral colors
- High trust feel
- Fast to fill

Tech Stack: Use the tech stack being used by project.

Requirements:

1. Replace Text Inputs with Better Controls

Age Range:
- Use dual range slider
- Example: 22 to 32

Height Range:
- Use dropdown or dual slider
- Example: 5'2" to 5'8"

Marital Status:
- Dropdown select

Caste:
- Searchable dropdown

Sub-caste:
- Searchable dropdown
- Only show after caste selected

Education:
- Multi-select chips or dropdown
- Graduate, Post Graduate, MBA, Any

Profession Type:
- Searchable dropdown

Annual Income:
- Dual range slider
- Example: ₹6L to ₹20L

Preferred City:
- Searchable city selector

Preferred State:
- Searchable dropdown

Food Habits:
- Choice chips:
  Vegetarian
  Non-Vegetarian
  Eggetarian
  Any

2. Organize into Sections

Use collapsible cards/accordion sections:

- Basic Preferences
  Age, Height, Marital Status

- Community Preferences
  Caste, Sub-caste

- Education & Career
  Education, Profession, Income

- Lifestyle & Location
  City, State, Food Habits

Only first section open by default.

3. Improve UX

- Show progress indicator:
  Example: 70% completed

- Add helper text:
  “All fields are optional”

- Add smart suggestion:
  “Based on your profile, we pre-filled recommended preferences.”

- Show Save Preferences sticky button on mobile

- Add Reset Filters secondary button

4. Responsive Behavior

Desktop:
- 2-column layout

Tablet:
- 2-column compact

Mobile:
- Single column
- Sticky bottom CTA

5. UI Details

- Card container with shadow-sm
- Rounded-2xl
- Clean spacing
- Inputs height 48px+
- Good visual hierarchy
- Elegant labels
- Accessible contrast

6. Output Needed

Generate complete production-ready React component using:
- Tailwind CSS
- shadcn/ui components
- Framer Motion for subtle animations

7. Extra Enhancement

Add Match Preview card on right side desktop:

Example:
Estimated Matches: 245 Profiles

When filters change, update preview count visually.

8. Important

Avoid old-fashioned matrimonial form look.
Avoid too many visible fields at once.
Must feel modern like Bumble + Shaadi.com premium hybrid.

Generate full clean code.