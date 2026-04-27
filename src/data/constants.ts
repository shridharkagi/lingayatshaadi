// Karnataka & Maharashtra districts (as per user spec)
export const KARNATAKA_DISTRICTS = [
  "Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar",
  "Chikballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad",
  "Gadag", "Kalaburagi", "Hassan", "Haveri", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru",
  "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"
];

export const MAHARASHTRA_DISTRICTS = [
  "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur",
  "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City",
  "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani",
  "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha",
  "Washim", "Yavatmal"
];

export const KA_MA_DISTRICTS = [...new Set([...KARNATAKA_DISTRICTS, ...MAHARASHTRA_DISTRICTS])].sort();

// State → Cities (from mock data, expand as needed)
export const STATE_CITIES: Record<string, string[]> = {
  Karnataka: ["Bangalore", "Belgaum", "Mysore", "Mangalore", "Hubli", "Davanagere", "Shimoga", "Gadag", "Dharwad"],
  Maharashtra: ["Mumbai", "Pune"],
  Telangana: ["Hyderabad"],
  "Tamil Nadu": ["Chennai"],
  Delhi: ["Delhi"],
};

// Indian states + Union Territories (sorted alphabetically)
export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // Union Territories
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
].sort();

/**
 * Common values for the "Whom does this contact belong to?" picker on each
 * profile contact number. The form also allows a free-text "Other" entry.
 */
export const CONTACT_OWNER_RELATIONS = [
  "Self",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Guardian",
  "Spouse",
  "Uncle",
  "Aunt",
  "Cousin",
  "Friend",
  "Other",
];

/** Communication channels supported per contact entry (multi-select tags). */
export const CONTACT_METHODS = ["Call", "WhatsApp", "SMS"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

// Zodiac signs (Rashi)
export const ZODIAC_SIGNS = [
  "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrishchika",
  "Dhanu", "Makara", "Kumbha", "Meena"
];

// Nakshatras
export const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya",
  "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha",
  "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
  "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

// Hobbies and interests (suggestions) - id maps to lucide icon name
export const HOBBY_SUGGESTIONS: { id: string; label: string }[] = [
  { id: "working-out", label: "Working out" },
  { id: "foodie", label: "Foodie" },
  { id: "trekking", label: "Trekking" },
  { id: "movies", label: "Movies" },
  { id: "travelling", label: "Travelling" },
  { id: "reading", label: "Reading" },
  { id: "music", label: "Music" },
  { id: "cooking", label: "Cooking" },
  { id: "photography", label: "Photography" },
  { id: "yoga", label: "Yoga" },
  { id: "sports", label: "Sports" },
  { id: "dancing", label: "Dancing" },
  { id: "gardening", label: "Gardening" },
  { id: "art", label: "Art" },
  { id: "writing", label: "Writing" },
];

// Profile photo limits
export const MAX_PROFILE_IMAGES = 5;

// Profession type/category - single select when creating profile, multiselect when searching
export const PROFESSION_TYPES = [
  "IT / Software",
  "Government Job",
  "Business",
  "Doctor",
  "Engineer",
  "Lawyer / Legal",
  "Teacher",
  "Private Job",
  "Self Employed",
  "Not Working",
  "Other",
] as const;

// Sub-caste options (alphabetically ordered, Others at end)
export const SUB_CASTE_OPTIONS = [
  "Agasa", "Akkasali", "Aradhya", "Balegala", "Banagar", "Banajiga", "Bhandari", "Bilijedaru",
  "Bilimagga", "Chaturtha", "Dikshwant", "Ganiga", "Gowda (Gowdike)", "Gowli", "Gurav", "Hadapada",
  "Hatgar", "Hugar/Hoogara", "Jadaru", "Jangama", "Kudu Vokkaliga", "Kumbar/Kumbara", "Kumbhar",
  "Kuruhina", "Lolagonda", "Madivala", "Malgar", "Mali", "Neelagar", "Neygi", "Nolamba",
  "Panchamasali", "Pattasali", "Reddy/Reddi", "Sadar", "Sajjan/Sajjanaganigar", "Setty", "Shilwant",
  "Shiva", "Simpi", "Vani", "Others",
] as const;

// Marital status options (matches profile creation)
export const MARITAL_STATUS_OPTIONS = [
  "Never Married",
  "Divorced",
  "Widowed",
  "Awaiting Divorce",
  "Separated",
] as const;

// Education qualifications (suggestions)
export const EDUCATION_SUGGESTIONS = [
  "Below 10th", "10th", "12th", "Diploma", "B.Sc", "B.Com", "B.A", "B.Tech", "B.E", "BBA", "BCA",
  "MBBS", "BDS", "B.Pharm", "B.Ed", "M.Sc", "M.Com", "M.A", "M.Tech", "M.E", "MBA", "MCA",
  "CA", "CS", "ICWA", "LLB", "LLM", "PhD", "Other"
];

// Food habits options
export const FOOD_HABITS_OPTIONS = [
  "Vegetarian",
  "Non-Vegetarian",
  "Eggetarian",
  "Vegan",
  "Jain",
] as const;
