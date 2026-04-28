"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  startTransition,
} from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Flag,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Phone,
  MapPin,
  Users,
  Calendar,
  GraduationCap,
  User,
  Ban,
  Briefcase,
  Images,
  X,
  Copy,
  Check,
  ShieldCheck,
  UserCheck,
  HeartHandshake,
  Lock,
  BadgeCheck,
  Clock,
  AlertTriangle,
  Headset,
} from "lucide-react";
import { useProfiles } from "@/contexts/ProfilesContext";
import { hasAcceptedInterest, hasSentInterest, sendInterest } from "@/lib/api/interests";
import { getProfileById, getProfileByPublicId, profileFromSnapshot } from "@/lib/api/profiles";
import { recordProfileView } from "@/lib/api/profileViews";
import { addToShortlist, removeFromShortlist, isShortlisted } from "@/lib/api/shortlist";
import { blockUser } from "@/lib/api/blocked";
import { reportProfile } from "@/lib/api/reports";
import { getAge } from "@/lib/utils";
import {
  maskString,
  truncateToWords,
  wordCount,
  formatDateDDMMYYYY,
} from "@/lib/profileUtils";
import {
  getProfileSlug,
  parseProfileSlug,
  getMemberIdDisplay,
  profileMatchesCanonicalPublicId,
} from "@/lib/memberId";
import { useAuth } from "@/contexts/AuthContext";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { FEATURE_MESSAGING_ENABLED } from "@/lib/featureFlags";
import { HobbyTag } from "@/components/ui/HobbyTag";
import { LanguageTag } from "@/components/ui/LanguageTag";
import { ProfileCard } from "@/components/ui/ProfileCard";
import { ContactsList } from "@/components/ui/ContactsList";
import { ViewerForensicWatermark } from "@/components/ViewerForensicWatermark";
import { Profile } from "@/types";
import { trackContactView } from "@/lib/contactViewHistory";
import { hasMeaningfulPreferences } from "@/lib/partnerPreferenceDefaults";
import { computeProfileCompletion } from "@/lib/profileCompletion";
import { buildProfileSeoTitle } from "@/lib/profileSeo";
import { buildProfileShareFooter, buildProfileShareText, getShortProfilePath } from "@/lib/profileShare";
import { getAccountAccessState } from "@/lib/api/accessState";
import { maskBirthDateKeepYear, maskLastName, MASKED_VALUE, type AccountAccessState } from "@/lib/accessPolicy";
import { WhatsAppGroupCta } from "@/components/whatsapp/WhatsAppGroupCta";

/** Session-only: user dismissed the confidential-use strip for this browser session. */
const CONFIDENTIAL_STRIP_SESSION_KEY = "profile_confidential_notice_dismiss";

function ShareProfileButton({ profile }: { profile: Profile }) {
  const handleShare = async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${getShortProfilePath(profile)}`
        : "";
    const title = buildProfileSeoTitle(profile);
    const text = buildProfileShareText(profile);
    const footer = buildProfileShareFooter();
    const shareMessage = url ? `${text}\n${url}\n\n${footer}` : `${text}\n\n${footer}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") copyToClipboard(shareMessage);
      }
    } else {
      copyToClipboard(shareMessage);
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
      aria-label="Share profile"
    >
      <Share2 size={20} />
    </button>
  );
}

function PartnerPreferenceTiles({ profile }: { profile: Profile }) {
  const firstName = (profile.fullName || "Member").trim().split(/\s+/)[0] || "Member";
  const location = [profile.partnerPreference?.city, profile.partnerPreference?.state]
    .filter(Boolean)
    .join(", ");

  const primaryItems = [
    profile.partnerPreference?.ageMin != null && profile.partnerPreference?.ageMax != null
      ? { label: "Age", value: `${profile.partnerPreference.ageMin} - ${profile.partnerPreference.ageMax} yrs` }
      : null,
    profile.partnerPreference?.heightMin && profile.partnerPreference?.heightMax
      ? { label: "Height", value: `${profile.partnerPreference.heightMin} - ${profile.partnerPreference.heightMax}` }
      : null,
    profile.partnerPreference?.maritalStatus
      ? { label: "Marital status", value: profile.partnerPreference.maritalStatus }
      : null,
    location ? { label: "Location", value: location } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const secondaryItems = [
    profile.partnerPreference?.education
      ? { label: "Education", value: profile.partnerPreference.education }
      : null,
    profile.partnerPreference?.profession
      ? { label: "Profession", value: profile.partnerPreference.profession }
      : null,
    profile.partnerPreference?.foodHabits
      ? { label: "Food", value: profile.partnerPreference.foodHabits }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const compactItems = [
    ...primaryItems.map((item) => ({
      ...item,
      span: "col-span-1",
    })),
    ...secondaryItems.map((item) => ({
      ...item,
      span: "col-span-1",
    })),
  ];

  return (
    <div>
      <p className="mb-2.5 text-sm text-gray-500">What {firstName} is looking for</p>
      {compactItems.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {compactItems.map((item) => (
            <div
              key={item.label}
              className={`${item.span} rounded-xl border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 sm:px-3 sm:py-2 min-h-[50px] sm:min-h-[50px] flex flex-col justify-center`}
            >
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                {item.label}
              </p>
              <p
                className="mt-0.5 break-words leading-snug text-[#2d241d] text-[0.82rem] sm:text-[0.9rem] font-semibold"
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* Card section matching the reference design: icon + gray heading + black details */
function DetailSection({
  icon: Icon,
  heading,
  children,
}: {
  icon: React.ElementType;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-4 border-b border-gray-100 last:border-0 last:pb-0 first:pt-0">
      <Icon size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 mb-1">{heading}</p>
        <div className="text-sm sm:text-base text-[var(--foreground)] space-y-0.5">{children}</div>
      </div>
    </div>
  );
}

/** Swipe card: JS timeouts match CSS transition durations (exit → route → enter). */
const SWIPE_EXIT_ROUTE_MS = 470;
const SWIPE_ENTER_SETTLE_MS = 830;

/** Full-screen gallery: horizontal swipe must clearly dominate vertical movement
 * so scrolling the page on the image does not advance photos. */
const GALLERY_SWIPE_MIN_DX = 56;
const GALLERY_SWIPE_DOMINANCE = 1.35;
/** Slight crossfade when changing the active gallery photo (ms). */
const GALLERY_IMG_TRANSITION_MS = 340;

/** Profile stack card: only treat as horizontal swipe after movement exceeds slop and |dx| dominates |dy|. */
const CARD_SWIPE_SLOP_PX = 12;
const CARD_SWIPE_HORIZONTAL_DOMINANCE = 1.25;

const UUID_PREFIX_RE =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:-.+)?$/i;

function parseUuidPrefix(slug: string): string | null {
  const m = (slug || "").match(UUID_PREFIX_RE);
  return m?.[1] || null;
}

function swipeVelocityFromSamples(pts: Array<{ x: number; t: number }>): number {
  if (pts.length < 2) return 0;
  const end = pts[pts.length - 1];
  const start = pts[Math.max(0, pts.length - 4)];
  const dt = end.t - start.t;
  if (dt < 16) return 0;
  return (end.x - start.x) / dt;
}

export default function OtherProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, authUser, isLoggedIn } = useAuth();
  const { openAuthModal } = useAuthModal();
  // Actor id (profiles.id) used for relational interactions like Interest,
  // Shortlist, Notes, Views — these tables FK to profiles(id) and have an
  // RLS policy that requires auth.uid() = profiles.user_id.
  // If the logged-in user hasn't completed their own matrimonial profile yet
  // we cannot insert into those tables — we surface a friendly prompt
  // instead of a silent / cryptic RLS error.
  const actorId = user?.id || "";
  const needsOwnProfile = isLoggedIn && !actorId;
  // True when the logged-in user is viewing their own matrimonial profile.
  // Drives owner-only affordances (CTA cards, completion nudges, etc).
  const { config } = useAppConfig();
  const { profiles, profilesLoading } = useProfiles();
  const [fallbackProfile, setFallbackProfile] = useState<Profile | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryImgOpacity, setGalleryImgOpacity] = useState(1);
  const galleryTouchStart = useRef<{ x: number; y: number } | null>(null);
  const galleryIndexCommitted = useRef<number | null>(null);
  const [hasShownInterest, setHasShownInterest] = useState(false);
  const [interestAccepted, setInterestAccepted] = useState(false);
  const [sendingInterest, setSendingInterest] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingShortlist, setSavingShortlist] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [reporting, setReporting] = useState(false);
  const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);
  const [copiedMemberId, setCopiedMemberId] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [stripNoticeDismissed, setStripNoticeDismissed] = useState(false);
  const [stripNoticeAutoHidden, setStripNoticeAutoHidden] = useState(false);
  const [contactHintVisible, setContactHintVisible] = useState(true);
  const [accessState, setAccessState] = useState<AccountAccessState | null>(null);
  const [localSavedIds, setLocalSavedIds] = useState<string[]>([]);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn) {
      setAccessState(null);
      return;
    }
    void (async () => {
      const access = await getAccountAccessState();
      if (cancelled) return;
      setAccessState(access);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || actorId) return;
    try {
      const raw = localStorage.getItem("saved_profiles_no_profile");
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      setLocalSavedIds(Array.isArray(ids) ? ids : []);
    } catch {
      setLocalSavedIds([]);
    }
  }, [isLoggedIn, actorId]);

  const slugFromParams = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const [displayedSlug, setDisplayedSlug] = useState(slugFromParams);

  useEffect(() => {
    setDisplayedSlug(slugFromParams);
  }, [slugFromParams]);

  /** Resolve profile from local slug first so stack navigation updates before the URL catches up (avoids flash / loading). */
  const lookupPublicId = useMemo(() => parseProfileSlug(displayedSlug), [displayedSlug]);
  const lookupUuidPrefix = useMemo(() => parseUuidPrefix(displayedSlug), [displayedSlug]);

  const profileFromContext = useMemo(() => {
    if (lookupPublicId) {
      return profiles.find((p) => profileMatchesCanonicalPublicId(p, lookupPublicId));
    }
    if (lookupUuidPrefix) {
      return profiles.find((p) => p.id === lookupUuidPrefix);
    }
    return profiles.find((p) => p.id === displayedSlug);
  }, [profiles, displayedSlug, lookupPublicId, lookupUuidPrefix]);

  // `rawProfile` holds whatever the DB / context gave us — which for the
  // owner is always their live, possibly-pending-edits data. Public
  // viewers, however, should only ever see the last-approved snapshot
  // (see Batch 5B moderation flow). We branch once here and then use
  // `profile` everywhere below as before, so the rest of the page is
  // unchanged.
  const rawProfile =
    profileFromContext ||
    (fallbackProfile && lookupPublicId && profileMatchesCanonicalPublicId(fallbackProfile, lookupPublicId)
      ? fallbackProfile
      : undefined);

  // Ownership check: does the logged-in auth account own this profile?
  // An account can own multiple profiles (self / son / daughter / etc.),
  // so matching on `profile.userId === authUser.id` is the correct
  // "am I the owner?" test — more accurate than the single `actorId`
  // comparison used further down the page.
  const isOwnerViewer = !!authUser?.id && !!rawProfile?.userId && rawProfile.userId === authUser.id;
  const viewerIsAdmin = (user?.role ?? "user") === "superadmin";
  const adminPreviewByQuery = searchParams.get("preview") === "admin";

  // Decide which view of the profile to render.
  //   * Owner or admin → always the live row (so they see their own
  //     pending edits with a "pending review" banner).
  //   * Public (approved) → the live row as usual.
  //   * Public (pending / rejected) with an existing snapshot → the
  //     frozen snapshot, so editable-but-unreviewed fields never leak.
  //   * Public (no snapshot yet, i.e. brand-new pending profile) →
  //     leave `profile` undefined so the page falls through to the
  //     "Profile not found" block, effectively hiding it.
  const profile = (() => {
    if (!rawProfile) return undefined;
    if (isOwnerViewer || viewerIsAdmin || adminPreviewByQuery) return rawProfile;
    const status = rawProfile.moderationStatus ?? "approved";
    if (status === "approved") return rawProfile;
    const snapshot = profileFromSnapshot(rawProfile.approvedSnapshot);
    return snapshot ?? undefined;
  })();

  const profileHiddenPendingPublic =
    !!rawProfile &&
    !profile &&
    !isOwnerViewer &&
    !viewerIsAdmin &&
    !adminPreviewByQuery;

  // Canonicalize URL to member-id slug whenever possible so shared/admin links
  // converge to `/profile/lb...-name` even if an older UUID-style link is opened.
  useEffect(() => {
    if (!profile) return;
    const canonical = getProfileSlug(profile);
    if (canonical && slugFromParams && canonical !== slugFromParams) {
      router.replace(`/profile/${canonical}`, { scroll: false });
    }
  }, [profile, slugFromParams, router]);

  // If the profile isn't in the in-memory context (e.g. visitor or RLS / pagination
  // hides it), fetch it directly by public id so the page never falsely shows
  // "Profile not found" on the first navigation.
  useEffect(() => {
    setFallbackProfile(null);
  }, [lookupPublicId, lookupUuidPrefix]);

  useEffect(() => {
    if (profileFromContext) return;
    if (profilesLoading && profiles.length === 0) return;
    if (!lookupPublicId && !lookupUuidPrefix) return;
    if (
      fallbackProfile &&
      ((lookupPublicId && profileMatchesCanonicalPublicId(fallbackProfile, lookupPublicId)) ||
        (lookupUuidPrefix && fallbackProfile.id === lookupUuidPrefix))
    ) {
      return;
    }
    let cancelled = false;
    setFallbackLoading(true);
    const fetchProfile = lookupPublicId
      ? getProfileByPublicId(lookupPublicId)
      : getProfileById(lookupUuidPrefix || "");
    fetchProfile.then(({ data }) => {
      if (cancelled) return;
      setFallbackProfile(data);
      setFallbackLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [profileFromContext, profilesLoading, profiles.length, lookupPublicId, lookupUuidPrefix, fallbackProfile]);

  const currentIdx = profile ? profiles.findIndex((p) => p.id === profile.id) : -1;
  const [isTransitioning, setIsTransitioning] = useState(false);

  const swipeCardRef = useRef<HTMLDivElement>(null);
  const swipePointerId = useRef<number | null>(null);
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  /** null = not decided; h = card follows horizontal drag; v = user is scrolling, ignore swipe. */
  const swipeAxisLockRef = useRef<"h" | "v" | null>(null);
  /** Recent pointer samples for fling velocity (px/ms), Tinder-style. */
  const swipeSamplesRef = useRef<Array<{ x: number; t: number }>>([]);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeDragging, setSwipeDragging] = useState(false);
  const [swipeExiting, setSwipeExiting] = useState(false);
  const [slideEnterInstant, setSlideEnterInstant] = useState(false);
  const [isEnteringSlide, setIsEnteringSlide] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);

  // Reset showContact when profile changes
  useEffect(() => {
    setShowContact(false);
  }, [profile?.id]);

  useEffect(() => {
    const lock = showContact && isLoggedIn;
    if (!lock) return;
    const scrollY = window.scrollY;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [showContact, isLoggedIn]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(CONFIDENTIAL_STRIP_SESSION_KEY) === "1") {
        setStripNoticeDismissed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !actorId || !profile?.id || actorId === profile.id) return;
    setStripNoticeAutoHidden(false);
  }, [profile?.id, isLoggedIn, actorId]);

  useEffect(() => {
    if (!isLoggedIn || !actorId || !profile?.id || actorId === profile.id) return;
    if (stripNoticeDismissed || stripNoticeAutoHidden) return;
    const t = window.setTimeout(() => setStripNoticeAutoHidden(true), 10000);
    return () => clearTimeout(t);
  }, [profile?.id, isLoggedIn, actorId, stripNoticeDismissed, stripNoticeAutoHidden]);

  useEffect(() => {
    if (showContact && isLoggedIn) setContactHintVisible(true);
  }, [showContact, isLoggedIn]);

  const dismissConfidentialStrip = useCallback(() => {
    try {
      sessionStorage.setItem(CONFIDENTIAL_STRIP_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setStripNoticeDismissed(true);
  }, []);

  // Record profile view when logged-in user views another profile
  useEffect(() => {
    if (actorId && profile?.id && actorId !== profile.id) {
      recordProfileView(actorId, profile.id);
    }
  }, [actorId, profile?.id]);

  const toggleContactDetails = useCallback(() => {
    if (!profile) return;
    if (showContact) {
      setShowContact(false);
      return;
    }
    setShowContact(true);
    void (async () => {
      const res = await trackContactView(profile, actorId || undefined);
      if (res.error) {
        setShowContact(false);
        showToast(res.error, "error");
      }
    })();
  }, [showContact, profile, actorId, showToast]);

  // Fetch interest status and shortlist when profile or user changes
  useEffect(() => {
    if (!profile?.id || !actorId) {
      setInterestAccepted(false);
      setHasShownInterest(false);
    } else {
      hasAcceptedInterest(actorId, profile.id).then(({ data }) => setInterestAccepted(!!data));
      hasSentInterest(actorId, profile.id).then(({ data }) => setHasShownInterest(!!data));
    }
    if (!profile?.id || !isLoggedIn) {
      setIsSaved(false);
      return;
    }
    if (!actorId) {
      setIsSaved(localSavedIds.includes(profile.id));
      return;
    }
    isShortlisted(actorId, profile.id).then(({ data }) => setIsSaved(!!data));
  }, [profile?.id, actorId, isLoggedIn, localSavedIds]);

  /** Slide direction after route change (enter-from side). Consumed in useLayoutEffect. */
  const pendingEnterRef = useRef<"next" | "prev" | null>(null);
  const enterHandledForProfileRef = useRef<string | null>(null);

  const cardSlideDistance = useCallback(() => {
    const el = swipeCardRef.current;
    const w = el?.offsetWidth ?? 0;
    const vw = typeof window !== "undefined" ? window.innerWidth : 400;
    return Math.min(Math.max(w * 1.12, 280), vw * 0.92);
  }, []);

  const goPrev = useCallback(() => {
    if (currentIdx <= 0 || isTransitioning) return;
    setIsTransitioning(true);
    setSwipeExiting(true);
    const dist = cardSlideDistance();
    setSwipeOffset(dist);
    window.setTimeout(() => {
      pendingEnterRef.current = "prev";
      const prevProfile = profiles[currentIdx - 1];
      const prevSlug = getProfileSlug(prevProfile);
      setDisplayedSlug(prevSlug);
      startTransition(() => {
        router.replace(`/profile/${prevSlug}`, { scroll: false });
      });
    }, SWIPE_EXIT_ROUTE_MS);
  }, [currentIdx, router, isTransitioning, profiles, cardSlideDistance]);

  const goNext = useCallback(() => {
    if (currentIdx < 0 || currentIdx >= profiles.length - 1 || isTransitioning) return;
    setIsTransitioning(true);
    setSwipeExiting(true);
    const dist = cardSlideDistance();
    setSwipeOffset(-dist);
    window.setTimeout(() => {
      pendingEnterRef.current = "next";
      const nextProfile = profiles[currentIdx + 1];
      const nextSlug = getProfileSlug(nextProfile);
      setDisplayedSlug(nextSlug);
      startTransition(() => {
        router.replace(`/profile/${nextSlug}`, { scroll: false });
      });
    }, SWIPE_EXIT_ROUTE_MS);
  }, [currentIdx, router, isTransitioning, profiles, cardSlideDistance]);

  useEffect(() => {
    const el = swipeCardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCardWidth(el.offsetWidth));
    ro.observe(el);
    setCardWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, [profile?.id]);

  /** Enter-from-side after route commit (pairs with pendingEnterRef set in goNext/goPrev / thumb commit). */
  useLayoutEffect(() => {
    if (!profile?.id) return;
    const dir = pendingEnterRef.current;
    if (dir === "next" || dir === "prev") {
      if (enterHandledForProfileRef.current === profile.id) return;
      pendingEnterRef.current = null;
      enterHandledForProfileRef.current = profile.id;
      const w =
        swipeCardRef.current?.offsetWidth ??
        Math.min(typeof window !== "undefined" ? window.innerWidth * 0.92 : 400, 440);
      const enterFrom = dir === "next" ? w * 1.08 : -w * 1.08;
      swipePointerId.current = null;
      setSwipeDragging(false);
      setSlideEnterInstant(true);
      setIsEnteringSlide(true);
      setSwipeExiting(false);
      setSwipeOffset(enterFrom);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSlideEnterInstant(false);
          setSwipeExiting(true);
          setSwipeOffset(0);
          window.setTimeout(() => {
            setIsTransitioning(false);
            setSwipeExiting(false);
            setIsEnteringSlide(false);
          }, SWIPE_ENTER_SETTLE_MS);
        });
      });
      return;
    }
    if (enterHandledForProfileRef.current === profile.id) return;
    enterHandledForProfileRef.current = null;
    setSwipeOffset(0);
    setSwipeDragging(false);
    setSwipeExiting(false);
    setSlideEnterInstant(false);
    setIsEnteringSlide(false);
    swipePointerId.current = null;
  }, [profile?.id]);

  const computeSwipeDx = useCallback(
    (rawDx: number) => {
      const w = swipeCardRef.current?.offsetWidth ?? 300;
      const vw = typeof window !== "undefined" ? window.innerWidth : 400;
      const span = Math.min(vw * 0.52, Math.max(w * 1.05, 320));
      let x = rawDx;
      if (currentIdx <= 0 && x > 0) {
        const cap = 100;
        x = x <= cap ? x : cap + (x - cap) * 0.2;
      }
      if (currentIdx >= profiles.length - 1 && x < 0) {
        const cap = -100;
        x = x >= cap ? x : cap + (x - cap) * 0.2;
      }
      return Math.max(-span, Math.min(span, x));
    },
    [currentIdx, profiles.length]
  );

  const onSwipePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (profiles.length <= 1 || currentIdx < 0 || isTransitioning || swipeExiting) return;
      if ((e.target as HTMLElement).closest("button")) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      swipePointerId.current = e.pointerId;
      swipeStartX.current = e.clientX;
      swipeStartY.current = e.clientY;
      swipeAxisLockRef.current = null;
      swipeSamplesRef.current = [];
      setSwipeDragging(true);
      // Defer setPointerCapture until we know the gesture is horizontal-dominant
      // so vertical page scroll on the photo is not hijacked.
    },
    [profiles.length, currentIdx, isTransitioning, swipeExiting]
  );

  const onSwipePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (swipePointerId.current !== e.pointerId) return;
      const dx = e.clientX - swipeStartX.current;
      const dy = e.clientY - swipeStartY.current;
      const lock = swipeAxisLockRef.current;
      if (lock === "v") return;
      if (lock === null) {
        const slop = CARD_SWIPE_SLOP_PX;
        if (dx * dx + dy * dy < slop * slop) return;
        if (Math.abs(dx) >= Math.abs(dy) * CARD_SWIPE_HORIZONTAL_DOMINANCE) {
          swipeAxisLockRef.current = "h";
          const t = typeof performance !== "undefined" ? performance.now() : Date.now();
          swipeSamplesRef.current = [{ x: e.clientX, t }];
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        } else {
          swipeAxisLockRef.current = "v";
          swipePointerId.current = null;
          setSwipeDragging(false);
          setSwipeOffset(0);
          return;
        }
      }
      const t = typeof performance !== "undefined" ? performance.now() : Date.now();
      const pts = swipeSamplesRef.current;
      pts.push({ x: e.clientX, t });
      if (pts.length > 6) pts.shift();
      setSwipeOffset(computeSwipeDx(dx));
    },
    [computeSwipeDx]
  );

  const finishSwipePointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (swipePointerId.current !== e.pointerId) return;
      const axisWasHorizontal = swipeAxisLockRef.current === "h";
      swipePointerId.current = null;
      swipeAxisLockRef.current = null;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* ignore */
      }
      setSwipeDragging(false);
      const tEnd = typeof performance !== "undefined" ? performance.now() : Date.now();
      swipeSamplesRef.current.push({ x: e.clientX, t: tEnd });
      const vx = swipeVelocityFromSamples(swipeSamplesRef.current);
      swipeSamplesRef.current = [];

      const w = swipeCardRef.current?.offsetWidth ?? 320;
      const threshold = Math.max(44, w * 0.11);
      const raw = e.clientX - swipeStartX.current;
      const FLING = 0.38;

      const commitNext =
        axisWasHorizontal &&
        currentIdx < profiles.length - 1 &&
        (raw <= -threshold || (raw < -28 && vx < -FLING));
      const commitPrev =
        axisWasHorizontal &&
        currentIdx > 0 &&
        (raw >= threshold || (raw > 28 && vx > FLING));

      if (!commitNext && !commitPrev) {
        setSwipeOffset(0);
        return;
      }

      const exitDist = Math.min(w * 1.35, typeof window !== "undefined" ? window.innerWidth * 0.95 : 420);
      if (commitNext) {
        setIsTransitioning(true);
        setSwipeExiting(true);
        setSwipeOffset(-exitDist);
        window.setTimeout(() => {
          pendingEnterRef.current = "next";
          const nextProfile = profiles[currentIdx + 1];
          const nextSlug = getProfileSlug(nextProfile);
          setDisplayedSlug(nextSlug);
          startTransition(() => {
            router.replace(`/profile/${nextSlug}`, { scroll: false });
          });
        }, SWIPE_EXIT_ROUTE_MS);
        return;
      }
      if (commitPrev) {
        setIsTransitioning(true);
        setSwipeExiting(true);
        setSwipeOffset(exitDist);
        window.setTimeout(() => {
          pendingEnterRef.current = "prev";
          const prevProfile = profiles[currentIdx - 1];
          const prevSlug = getProfileSlug(prevProfile);
          setDisplayedSlug(prevSlug);
          startTransition(() => {
            router.replace(`/profile/${prevSlug}`, { scroll: false });
          });
        }, SWIPE_EXIT_ROUTE_MS);
        return;
      }
    },
    [currentIdx, profiles, router, setDisplayedSlug]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goPrev, goNext]);

  useEffect(() => {
    if (currentIdx < 0 || profiles.length < 2) return;
    if (currentIdx < profiles.length - 1) {
      router.prefetch(`/profile/${getProfileSlug(profiles[currentIdx + 1])}`);
    }
    if (currentIdx > 0) {
      router.prefetch(`/profile/${getProfileSlug(profiles[currentIdx - 1])}`);
    }
  }, [currentIdx, profiles, router]);

  useEffect(() => {
    if (!showGallery) {
      galleryIndexCommitted.current = null;
      setGalleryImgOpacity(1);
      return;
    }
    if (galleryIndexCommitted.current === null) {
      galleryIndexCommitted.current = currentImageIndex;
      setGalleryImgOpacity(1);
      return;
    }
    if (galleryIndexCommitted.current === currentImageIndex) return;
    galleryIndexCommitted.current = currentImageIndex;
    setGalleryImgOpacity(0.42);
    const id = window.setTimeout(() => setGalleryImgOpacity(1), 48);
    return () => window.clearTimeout(id);
  }, [currentImageIndex, showGallery]);

  const swipeMotion = useMemo(() => {
    const wPx = Math.max(cardWidth, 260);
    const norm = wPx > 0 ? swipeOffset / wPx : 0;
    const finger = swipeDragging;
    const clampRot = (deg: number, lim: number) => Math.max(-lim, Math.min(lim, deg));
    const rotateDeg = finger
      ? clampRot((swipeOffset / wPx) * 22, 22)
      : clampRot((swipeOffset / wPx) * 11, 10);
    const scale = finger ? 1 + Math.min(0.04, Math.abs(norm) * 0.07) : 1;
    const drift = Math.abs(swipeOffset);
    const hint = Math.min(1, Math.max(0, drift / Math.max(wPx * 0.24, 64) - 0.05));
    const shadowBlur = 16 + drift * 0.1;
    const shadowY = 5 + drift * 0.045;
    const shadowAlpha = 0.07 + Math.min(0.2, drift / 560);
    return { wPx, rotateDeg, scale, hint, shadowBlur, shadowY, shadowAlpha };
  }, [swipeOffset, cardWidth, swipeDragging]);

  const whatsappUrl = config.whatsappGroupUrl?.trim() || "";
  const openSupportPopup = () => {
    if (typeof document !== "undefined") {
      const floatBtn = document.getElementById("contact-float-btn") as HTMLButtonElement | null;
      if (floatBtn) {
        floatBtn.click();
        return;
      }
    }
    if (typeof window !== "undefined") {
      window.location.href = `tel:${(config.callContactNumber || "6360130905").replace(/\D/g, "")}`;
    }
  };

  const shareCurrentProfile = async () => {
    if (!profile) return;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${getShortProfilePath(profile)}`
        : "";
    const title = buildProfileSeoTitle(profile);
    const text = buildProfileShareText(profile);
    const footer = buildProfileShareFooter();
    const shareMessage = url ? `${text}\n${url}\n\n${footer}` : `${text}\n\n${footer}`;

    const copyToClipboard = async (value: string) => {
      if (!value) return;
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return;
      }
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    await copyToClipboard(shareMessage);
    showToast("Profile link copied");
  };

  const handleCopyMemberId = async () => {
    if (!profile) return;
    const memberId = getMemberIdDisplay(profile);
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(memberId);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = memberId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedMemberId(true);
      setTimeout(() => setCopiedMemberId(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!profile) {
    const blockingInitialList = profilesLoading && profiles.length === 0;
    if (blockingInitialList || fallbackLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500">
            <span className="inline-block w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            <span>Loading profile…</span>
          </div>
        </div>
      );
    }
    if (profileHiddenPendingPublic) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto">
          <p className="text-[var(--foreground)] font-medium text-lg mb-2">Profile not available yet</p>
          <p className="text-sm text-gray-600 mb-6">
            This member profile is still under admin review or has no published version. Check back later, or browse
            other profiles from Search or Brides / Grooms.
          </p>
          <Link href="/home" className="text-[var(--primary)] font-medium underline">
            Go home
          </Link>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Profile not found</p>
        <Link href="/home" className="text-[var(--primary)] ml-2">
          Go home
        </Link>
      </div>
    );
  }

  const hasValidSubscription = !!accessState?.hasValidSubscription;
  const canViewSensitiveFields = isLoggedIn && hasValidSubscription;
  const canUseContact = !!accessState?.canContact;
  const canSendInterestNow = !!accessState?.canSendInterest;
  const displayName = canViewSensitiveFields
    ? profile.fullName
    : isLoggedIn
      ? maskLastName(profile.fullName)
      : maskString(profile.fullName, 5);
  const displaySubCaste = canViewSensitiveFields ? profile.subCaste : maskString(profile.subCaste, 3);
  const displayFatherName = canViewSensitiveFields ? profile.fatherName : maskString(profile.fatherName, 4);
  const displayMotherName = canViewSensitiveFields ? profile.motherName : maskString(profile.motherName, 4);
  const displaySibling = canViewSensitiveFields ? profile.siblingDetails : maskString(profile.siblingDetails, 2);
  const displayDateOfBirth = canViewSensitiveFields
    ? formatDateDDMMYYYY(profile.dateOfBirth)
    : maskBirthDateKeepYear(profile.dateOfBirth);
  const displayTimeOfBirth = profile.timeOfBirth
    ? canViewSensitiveFields
      ? profile.timeOfBirth
      : "****"
    : "";

  const aboutMeTruncated = truncateToWords(profile.aboutMe, 100);
  const aboutMeWords = wordCount(profile.aboutMe);

  const allPhotos = [
    ...(profile.profilePhoto ? [profile.profilePhoto] : []),
    ...(profile.photos || []).filter((p) => p !== profile.profilePhoto),
  ];
  const hasMultiplePhotos = allPhotos.length > 1;
  const contactSheetOpen = showContact && isLoggedIn;
  const showForensicOverlay = !!(isLoggedIn && actorId && profile.id && actorId !== profile.id);
  const showConfidentialBanner =
    showForensicOverlay && !stripNoticeDismissed && !stripNoticeAutoHidden;

  // Owner/admin-only banner that surfaces the moderation status. Public
  // viewers never see these since they're rendering from the approved
  // snapshot (or the page 404s for brand-new pending profiles).
  const moderationBanner = (() => {
    if (!(isOwnerViewer || viewerIsAdmin)) return null;
    const status = profile.moderationStatus ?? "approved";
    if (status === "approved") return null;
    if (status === "pending_review") {
      return (
        <div className="mx-4 mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 flex items-start gap-2.5">
          <Clock size={18} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">
              {profile.approvedSnapshot
                ? "Edits pending admin review"
                : "Profile pending admin review"}
            </p>
            <p className="text-xs mt-0.5 opacity-90">
              {profile.approvedSnapshot
                ? "Other members see your previously-approved version until an admin approves the changes."
                : "Your profile will be visible to others once an admin approves it."}
            </p>
          </div>
        </div>
      );
    }
    if (status === "rejected") {
      return (
        <div className="mx-4 mt-3 p-3 rounded-xl border border-red-200 bg-red-50 text-red-900 flex items-start gap-2.5">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Profile changes not approved</p>
            {profile.rejectionReason ? (
              <p className="text-xs mt-0.5 opacity-90">
                Reason: {profile.rejectionReason}
              </p>
            ) : (
              <p className="text-xs mt-0.5 opacity-90">
                Please edit and re-submit. An admin has asked for changes.
              </p>
            )}
          </div>
        </div>
      );
    }
    if (status === "draft") {
      return (
        <div className="mx-4 mt-3 p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 flex items-start gap-2.5">
          <Clock size={18} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Draft — not submitted yet</p>
            <p className="text-xs mt-0.5 opacity-90">
              Complete and save the profile to submit it for admin review.
            </p>
          </div>
        </div>
      );
    }
    return null;
  })();

  return (
    <div
      className={`w-full max-w-[1800px] mx-auto px-3 sm:px-2 lg:px-2 xl:px-3${showForensicOverlay ? " pb-20" : " pb-6"}`}
    >
      {moderationBanner}
      {showForensicOverlay && <ViewerForensicWatermark />}
      {showConfidentialBanner && (
        <div className="mx-0 sm:mx-2 mt-1 flex gap-2 items-start rounded-2xl bg-amber-50/90 border border-amber-100 px-3 py-2.5 text-[11px] sm:text-xs text-amber-950 leading-snug">
          <div className="flex-1 min-w-0">
            <span>Member details are confidential — for your matrimonial search only. Misuse may lead to suspension. </span>
            <Link href="/terms" className="underline font-medium text-[var(--primary)]">
              Terms
            </Link>
            <span> · </span>
            <Link href="/privacy" className="underline font-medium text-[var(--primary)]">
              Privacy
            </Link>
            <span> · </span>
            <button
              type="button"
              className="underline font-medium text-[var(--primary)]"
              onClick={() => setShowReportModal(true)}
            >
              Report misuse
            </button>
            <span> · Profile views may be logged for safety.</span>
          </div>
          <button
            type="button"
            onClick={dismissConfidentialStrip}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-amber-200/60 text-amber-900/80"
            aria-label="Hide notice for this session"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
      )}
      {showGallery && hasMultiplePhotos && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
        >
          <button
            onClick={() => setShowGallery(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
            aria-label="Close gallery"
          >
            <X size={24} />
          </button>
          
          {/* Image counter */}
          <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium">
            {currentImageIndex + 1} / {allPhotos.length}
          </div>
          
          {/* Main image display */}
          <div className="flex-1 flex items-center justify-center relative">
            {/* Previous button */}
            <button
              onClick={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1))}
              className="absolute left-4 z-10 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
              aria-label="Previous image"
            >
              <ChevronLeft size={28} strokeWidth={2.5} />
            </button>
            
            {/* Current image: vertical scroll must not change photo — require horizontal-dominant swipe. */}
            <div
              className="relative w-full h-full flex items-center justify-center px-16 touch-pan-y"
              style={{ touchAction: "pan-y" }}
              onTouchStart={(e) => {
                const t = e.touches[0];
                galleryTouchStart.current = { x: t.clientX, y: t.clientY };
              }}
              onTouchEnd={(e) => {
                const start = galleryTouchStart.current;
                galleryTouchStart.current = null;
                if (!start) return;
                const t = e.changedTouches[0];
                const dx = start.x - t.clientX;
                const dy = start.y - t.clientY;
                const horizDominant =
                  Math.abs(dx) >= Math.abs(dy) * GALLERY_SWIPE_DOMINANCE &&
                  Math.abs(dx) >= GALLERY_SWIPE_MIN_DX;
                if (!horizDominant) return;
                if (dx > 0) {
                  setCurrentImageIndex((prev) => (prev < allPhotos.length - 1 ? prev + 1 : 0));
                } else {
                  setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1));
                }
              }}
            >
              <div
                className="relative max-w-4xl max-h-[80vh] w-full h-full"
                style={{
                  opacity: galleryImgOpacity,
                  transition: `opacity ${GALLERY_IMG_TRANSITION_MS}ms ease-out`,
                }}
              >
                <Image
                  src={allPhotos[currentImageIndex]}
                  alt={`${profile.fullName} photo ${currentImageIndex + 1}`}
                  fill
                  className={`object-contain ${!canViewSensitiveFields ? "select-none pointer-events-none" : ""}`}
                  style={!canViewSensitiveFields ? { filter: "blur(var(--blur-md))" } : undefined}
                  unoptimized
                  sizes="100vw"
                />
              </div>
            </div>
            
            {/* Next button */}
            <button
              onClick={() => setCurrentImageIndex((prev) => (prev < allPhotos.length - 1 ? prev + 1 : 0))}
              className="absolute right-4 z-10 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
              aria-label="Next image"
            >
              <ChevronRight size={28} strokeWidth={2.5} />
            </button>
          </div>
          
          {/* Thumbnail strip at bottom */}
          <div className="p-4 bg-black/50 backdrop-blur-sm">
            <div className="flex gap-2 justify-center overflow-x-auto max-w-4xl mx-auto">
              {allPhotos.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImageIndex(i)}
                  className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden transition-all duration-300 ease-out ${
                    i === currentImageIndex ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={src}
                    alt={`Thumbnail ${i + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <header className="sticky top-0 bg-white/95 backdrop-blur border-b border-[var(--border)] px-3 sm:px-4 py-3 flex items-center justify-between z-10 rounded-b-2xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors font-medium text-[var(--foreground)]"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
          <span className="hidden sm:inline">Back</span>
        </button>
        
        {/* Profile navigation indicator */}
        {currentIdx >= 0 && profiles.length > 1 && (
          <div className="flex flex-col items-center gap-1 min-w-0 flex-1 px-2">
            <span className="text-xs sm:text-sm font-semibold text-[var(--primary)] tracking-tight truncate max-w-[11rem] sm:max-w-none">
              LingayatShaadi
            </span>
            <div className="flex gap-1">
              {profiles.slice(Math.max(0, currentIdx - 2), Math.min(profiles.length, currentIdx + 3)).map((_, i) => {
                const actualIndex = Math.max(0, currentIdx - 2) + i;
                return (
                  <div
                    key={actualIndex}
                    className={`h-1.5 rounded-full transition-all ${
                      actualIndex === currentIdx
                        ? "w-8 bg-[var(--primary)]"
                        : "w-1.5 bg-gray-300"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}
        
        <ShareProfileButton profile={profile} />
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(340px,40%)_minmax(0,60%)] lg:gap-3 xl:gap-4 lg:items-start">
      <div className="space-y-3 lg:sticky lg:top-[84px]">
      <div
        className="relative w-full isolate contain-layout overflow-hidden rounded-2xl"
        style={{ perspective: 1100, WebkitPerspective: 1100 }}
      >
        <div
          ref={swipeCardRef}
          className="relative z-[1] overflow-hidden rounded-t-2xl rounded-b-none select-none touch-pan-y"
          style={{
            // Prefer native vertical scroll; horizontal profile swipe is handled in JS after axis lock.
            touchAction: "pan-y",
            transform: `translate3d(${swipeOffset}px,0,0) rotate(${swipeMotion.rotateDeg}deg) scale(${swipeMotion.scale})`,
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transition:
              slideEnterInstant || swipeDragging
                ? "none"
                : isEnteringSlide
                  ? "transform 0.72s cubic-bezier(0.14, 0.88, 0.18, 1)"
                  : swipeExiting && Math.abs(swipeOffset) > 2
                    ? "transform 0.45s cubic-bezier(0.28, 0.85, 0.36, 1)"
                    : "transform 0.58s cubic-bezier(0.24, 1, 0.36, 1)",
            willChange: swipeDragging || swipeExiting || isEnteringSlide ? "transform" : "auto",
            boxShadow:
              swipeDragging && Math.abs(swipeOffset) > 4
                ? `0 ${swipeMotion.shadowY}px ${swipeMotion.shadowBlur}px rgba(0,0,0,${swipeMotion.shadowAlpha})`
                : "0 4px 24px rgba(0,0,0,0.08)",
          }}
          onPointerDown={onSwipePointerDown}
          onPointerMove={onSwipePointerMove}
          onPointerUp={finishSwipePointer}
          onPointerCancel={finishSwipePointer}
        >
          {profiles.length > 1 && currentIdx >= 0 && (
            <>
              <div
                className="pointer-events-none absolute inset-0 z-[6] rounded-t-2xl rounded-b-none bg-gradient-to-l from-[var(--primary)]/45 to-transparent"
                style={{
                  opacity: swipeOffset < -8 ? swipeMotion.hint * 0.55 : 0,
                  transition: "opacity 0.08s ease-out",
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-0 z-[6] rounded-t-2xl rounded-b-none bg-gradient-to-r from-black/35 to-transparent"
                style={{
                  opacity: swipeOffset > 8 ? swipeMotion.hint * 0.45 : 0,
                  transition: "opacity 0.08s ease-out",
                }}
                aria-hidden
              />
              <div className="pointer-events-none absolute inset-0 z-[7] rounded-t-2xl rounded-b-none" aria-hidden>
                <span
                  className="absolute top-[16%] right-[8%] font-black tracking-[0.2em] text-[clamp(1.65rem,8vw,2.75rem)] uppercase text-white"
                  style={{
                    opacity: swipeOffset < -20 ? swipeMotion.hint : 0,
                    transform: `rotate(-13deg) scale(${0.82 + swipeMotion.hint * 0.22})`,
                    textShadow:
                      "0 0 1px rgba(0,0,0,0.5), 0 3px 22px rgba(0,0,0,0.45), 0 0 42px rgba(249,115,22,0.4)",
                    transition: "opacity 0.08s ease-out",
                  }}
                >
                  Next
                </span>
                <span
                  className="absolute top-[16%] left-[8%] font-black tracking-[0.18em] text-[clamp(1.5rem,7vw,2.35rem)] uppercase text-white"
                  style={{
                    opacity: swipeOffset > 20 ? swipeMotion.hint : 0,
                    transform: `rotate(13deg) scale(${0.82 + swipeMotion.hint * 0.22})`,
                    textShadow: "0 0 1px rgba(0,0,0,0.45), 0 3px 22px rgba(0,0,0,0.5)",
                    transition: "opacity 0.08s ease-out",
                  }}
                >
                  Back
                </span>
              </div>
            </>
          )}
          <div className="relative aspect-[4/5] md:aspect-[3/4] md:max-h-[620px] md:mx-auto md:w-[min(100%,560px)] lg:w-full lg:max-h-[760px] max-h-[640px] bg-gray-200 overflow-hidden rounded-t-2xl rounded-b-none">
            <Image
              src={profile.profilePhoto || "/placeholder.svg"}
              alt={profile.fullName}
              fill
              className="object-cover rounded-t-2xl rounded-b-none pointer-events-none"
              unoptimized
              priority
              draggable={false}
            />
            {hasMultiplePhotos && (
              <button
                onClick={() => setShowGallery(true)}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white transition z-10 flex items-center gap-1.5 text-sm font-medium"
                aria-label="View gallery"
              >
                <Images size={18} />
                <span>{allPhotos.length}</span>
              </button>
            )}
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 pointer-events-none sm:pointer-events-auto">
              <button
                type="button"
                onClick={goPrev}
                disabled={currentIdx <= 0}
                className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg pointer-events-auto"
                aria-label="Previous profile"
              >
                <ChevronLeft size={24} className="text-white" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={currentIdx >= profiles.length - 1}
                className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg pointer-events-auto"
                aria-label="Next profile"
              >
                <ChevronRight size={24} className="text-white" strokeWidth={2.5} />
              </button>
            </div>
          </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white rounded-b-none pointer-events-none">
          <h1 className="text-xl sm:text-2xl font-bold">{displayName}</h1>
          <p className="text-white/90">
            {getAge(profile.dateOfBirth)} yrs • {profile.height}&quot;
            {profile.district && <span> • {profile.district}</span>}
          </p>
          {profile.profession && (
            <p className="text-white/90 text-sm mt-1 flex items-center gap-1.5">
              <Briefcase size={14} className="flex-shrink-0" />
              {profile.profession}
            </p>
          )}
          {(() => {
            if (!profile.verified) return null;
            return (
              <span
                className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-100 rounded-[8px]"
                title="Verified profile"
              >
                <BadgeCheck size={13} />
                Verified
              </span>
            );
          })()}
          <span className="inline-block mt-2 ml-2 px-2.5 py-1 text-xs font-medium text-white bg-white/20 rounded-[8px]">
            {getMemberIdDisplay(profile)}
          </span>
        </div>
        </div>
      </div>

      {/* Action buttons - mobile-first, large tap targets */}
      <div className="px-2 sm:px-3 py-2.5 rounded-b-2xl rounded-t-none bg-gradient-to-b from-white to-gray-50 border border-gray-100 border-t-gray-200/70">
        <div className={`grid ${FEATURE_MESSAGING_ENABLED ? "grid-cols-6" : "grid-cols-5"} gap-2`}>
          <button
            onClick={async () => {
              if (!isLoggedIn) {
                openAuthModal("login");
                return;
              }
              if (!canSendInterestNow || needsOwnProfile) {
                setShowCreateProfileModal(true);
                return;
              }
              if (!actorId || !profile || hasShownInterest || sendingInterest) return;
              setSendingInterest(true);
              const { error } = await sendInterest(
                actorId,
                profile.id,
                undefined,
                user?.fullName
              );
              setSendingInterest(false);
              if (!error) {
                setHasShownInterest(true);
                showToast("Interest sent");
              } else {
                console.warn("[interest] failed:", error);
                showToast(error || "Could not send interest", "error");
              }
            }}
            disabled={hasShownInterest || sendingInterest}
            className={`flex flex-col items-center justify-center gap-1 px-1.5 py-2 rounded-xl transition min-h-[56px] border ${
              hasShownInterest
                ? "bg-red-50 border-red-200 text-red-600 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.08)]"
                : "bg-white hover:bg-gray-100 active:bg-gray-200 border-gray-200/80"
            } ${sendingInterest ? "opacity-70" : ""}`}
          >
            <Heart size={18} className={`flex-shrink-0 ${hasShownInterest ? "fill-red-600" : ""}`} />
            <span className="text-[11px] sm:text-xs font-semibold truncate">Interest</span>
          </button>
          {FEATURE_MESSAGING_ENABLED &&
            (interestAccepted ? (
              <Link href={`/messages/${profile.id}`} className="min-h-[56px]">
                <button className="w-full h-full flex flex-col items-center justify-center gap-1 px-1.5 py-2 rounded-xl bg-white hover:bg-gray-100 active:bg-gray-200 transition border border-gray-200/80">
                  <MessageCircle size={18} className="flex-shrink-0" />
                  <span className="text-[11px] sm:text-xs font-semibold truncate">Message</span>
                </button>
              </Link>
            ) : (
              <button
                disabled
                title="Accept interest request first to message"
                className="flex flex-col items-center justify-center gap-1 px-1.5 py-2 rounded-xl opacity-50 cursor-not-allowed min-h-[56px] border border-gray-200 bg-white"
              >
                <MessageCircle size={18} className="flex-shrink-0" />
                <span className="text-[11px] sm:text-xs font-semibold truncate">Message</span>
              </button>
            ))}
          {!isLoggedIn ? (
            <a
              href={`tel:${(config.callContactNumber || "6360130905").replace(/\D/g, "")}`}
              className="flex flex-col items-center justify-center gap-1 px-1.5 py-2 rounded-xl bg-white hover:bg-gray-100 active:bg-gray-200 transition min-h-[56px] border border-gray-200/80"
            >
              <Phone size={18} className="flex-shrink-0" />
              <span className="text-[11px] sm:text-xs font-semibold truncate">Contact</span>
            </a>
          ) : (
            <button
              onClick={() => {
                if (!canUseContact) {
                  showToast("Upgrade your plan to view full profile details and contact information.", "error");
                  return;
                }
                toggleContactDetails();
              }}
              className={`flex flex-col items-center justify-center gap-1 px-1.5 py-2 rounded-xl transition min-h-[56px] border ${
                showContact 
                  ? "bg-blue-50 border-blue-200 text-blue-600 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08)]"
                  : "bg-white hover:bg-gray-100 active:bg-gray-200 border-gray-200/80"
              }`}
            >
              <Phone size={18} className="flex-shrink-0" />
              <span className="text-[11px] sm:text-xs font-semibold truncate">Contact</span>
            </button>
          )}
          <button
            onClick={async () => {
              if (!isLoggedIn) {
                openAuthModal("login");
                return;
              }
              if (!profile || savingShortlist) return;
              if (!actorId) {
                const next = !isSaved;
                const nextIds = next
                  ? Array.from(new Set([...localSavedIds, profile.id]))
                  : localSavedIds.filter((id) => id !== profile.id);
                try {
                  localStorage.setItem("saved_profiles_no_profile", JSON.stringify(nextIds));
                } catch {
                  // ignore localStorage errors
                }
                setLocalSavedIds(nextIds);
                setIsSaved(next);
                showToast(next ? "Added to saved profiles" : "Removed from saved profiles");
                return;
              }
              setSavingShortlist(true);
              const { error } = isSaved
                ? await removeFromShortlist(actorId, profile.id)
                : await addToShortlist(actorId, profile.id);
              setSavingShortlist(false);
              if (!error) {
                const next = !isSaved;
                setIsSaved(next);
                showToast(next ? "Added to shortlist" : "Removed from shortlist");
              } else {
                console.warn("[shortlist] failed:", error);
                showToast(error || "Could not update shortlist", "error");
              }
            }}
            disabled={savingShortlist}
            className={`flex flex-col items-center justify-center gap-1 px-1.5 py-2 rounded-xl transition min-h-[56px] border ${
              isSaved
                ? "bg-amber-50 border-amber-200 text-amber-700 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.1)]"
                : "bg-white hover:bg-gray-100 active:bg-gray-200 border-gray-200/80"
            }`}
            aria-label="Save to shortlist"
          >
            <Bookmark size={18} className={`flex-shrink-0 ${isSaved ? "fill-amber-700" : ""}`} />
            <span className="text-[11px] sm:text-xs font-semibold truncate">Save</span>
          </button>
          <button
            type="button"
            onClick={openSupportPopup}
            className="flex flex-col items-center justify-center gap-1 px-1.5 py-2 rounded-xl transition min-h-[56px] border bg-white hover:bg-gray-100 active:bg-gray-200 border-gray-200/80"
            aria-label="Contact support"
          >
            <Headset size={18} className="flex-shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold truncate">Support</span>
          </button>
          <button
            type="button"
            onClick={() => {
              void shareCurrentProfile();
            }}
            className="flex flex-col items-center justify-center gap-1 px-1.5 py-2 rounded-xl transition min-h-[56px] border bg-white hover:bg-gray-100 active:bg-gray-200 border-gray-200/80"
            aria-label="Share profile"
          >
            <Share2 size={18} className="flex-shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold truncate">Share</span>
          </button>
        </div>
        
        {whatsappUrl && (
          <div className="mt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl hover:bg-green-50 active:bg-green-100 transition text-[#25D366] min-h-[44px] border border-transparent hover:border-green-200 w-full font-medium"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="text-sm font-medium">Join WhatsApp Group</span>
            </a>
          </div>
        )}
      </div>
      </div>

      <div className="space-y-4 mt-1 lg:max-h-[calc(100vh-104px)] lg:overflow-y-auto lg:pr-0.5">
        <div className="space-y-4">
        {profile.aboutMeVisible && profile.aboutMe && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-base sm:text-lg text-[var(--foreground)] mb-2">About Me</h3>
            <p className="text-sm sm:text-base text-gray-600">{aboutMeTruncated}</p>
            {aboutMeWords > 100 && (
              <p className="text-xs text-gray-400 mt-2">
                (Limited to 100 words. {aboutMeWords} words in original.)
              </p>
            )}
          </div>
        )}

        {/* Hobbies and Interests - after About Me (Screen 1 design) */}
        {profile.hobbies && profile.hobbies.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-base sm:text-lg text-[var(--foreground)] mb-3 pb-2 border-b border-gray-200">
              Hobbies and Interests
            </h3>
            <div className="flex flex-wrap gap-2 pt-1">
              {profile.hobbies.map((hobby) => (
                <HobbyTag key={hobby} label={hobby} />
              ))}
            </div>
          </div>
        )}

        {/* Profile Details - reference design (Location, Education & Career, Family) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-base sm:text-lg text-[var(--foreground)] mb-3">Profile Details</h3>
          {!isLoggedIn && (
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="w-full text-left mb-4 flex items-start sm:items-center gap-3 p-3 sm:p-4 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/20 hover:bg-[var(--primary)]/10 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-white flex items-center justify-center flex-shrink-0">
                <User size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Login to view full profile
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  Sign in to see name, photos, contact details and connect with this profile.
                </p>
              </div>
              <span className="hidden sm:inline-block px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-medium flex-shrink-0">
                Login
              </span>
            </button>
          )}
          {isLoggedIn && !hasValidSubscription && (
            <div className="w-full text-left mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                  <Lock size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Upgrade your plan to view full profile details and contact information.
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                    Upgrade to reveal sensitive details, or contact support for help.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Link
                  href="/membership"
                  className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium"
                >
                  Upgrade Plan
                </Link>
                <button
                  type="button"
                  onClick={openSupportPopup}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white"
                >
                  Contact Support
                </button>
              </div>
            </div>
          )}
          <div className="divide-y divide-gray-100">
            <div className="py-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <User size={18} className="text-gray-400 flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-gray-500">Basic Info</p>
                  </div>
                  <div className="mt-1">
                    {(() => {
                      const mb = profile.managedBy;
                      // Use explicit managedBy from profile row to avoid accidental
                      // misclassification based on account holder naming patterns.
                      const isAdmin = mb === "admin";
                      const isSelf = mb === "self";
                      const isParentGuardian = mb === "parent" || mb === "guardian";
                      if (!isAdmin && !isSelf && !isParentGuardian) return null;

                      let label = "";
                      let Icon = UserCheck;
                      let tone = "";
                      if (isSelf) {
                        label = "Managed by Self";
                        Icon = UserCheck;
                        tone = "text-emerald-700 bg-emerald-50 border-emerald-200";
                      } else if (isAdmin) {
                        label = "Managed by Admin";
                        Icon = ShieldCheck;
                        tone = "text-amber-700 bg-amber-50 border-amber-200";
                      } else {
                        label = "Managed by Parent";
                        Icon = HeartHandshake;
                        tone = "text-[var(--primary)] bg-[var(--primary)]/10 border-[var(--primary)]/20";
                      }

                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium leading-none align-middle ${tone}`}
                          title={label}
                        >
                          <Icon size={12} className="flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{label}</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 min-w-[170px] sm:min-w-[200px]">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Member ID
                  </p>
                  <button
                    onClick={handleCopyMemberId}
                    className="mt-0.5 inline-flex items-center gap-1.5 px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer font-semibold text-[0.88rem] text-[#2d241d]"
                    title="Click to copy"
                  >
                    <span>{getMemberIdDisplay(profile)}</span>
                    {copiedMemberId ? (
                      <Check size={14} className="text-green-600" />
                    ) : (
                      <Copy size={14} className="text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-2.5 space-y-2">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 auto-rows-[56px] sm:auto-rows-[60px]">
                  <div className="col-span-2 md:col-span-4 rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Full Name
                    </p>
                    <p className="mt-0.5 text-[0.88rem] font-semibold text-[#2d241d] break-words">{displayName}</p>
                  </div>

                  <div className="col-span-1 md:col-span-2 rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Height
                    </p>
                    <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d]">{profile.height}&quot;</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 auto-rows-[56px] sm:auto-rows-[60px]">
                  <div className="rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Birth Date
                    </p>
                    <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d]">{displayDateOfBirth}</p>
                  </div>

                  <div className="rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Marital Status
                    </p>
                    <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d]">{profile.maritalStatus}</p>
                  </div>

                  <div className="rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Caste
                    </p>
                    <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d]">{profile.caste}</p>
                  </div>

                  <div className="rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Sub-Caste
                    </p>
                    <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d] break-words">{displaySubCaste || "—"}</p>
                  </div>
                </div>
              </div>
            </div>
            <DetailSection icon={MapPin} heading="Location">
              <p>{profile.city}, {profile.district}, {profile.state}</p>
            </DetailSection>
            <DetailSection icon={GraduationCap} heading="Education & Career">
              <p>{profile.qualification || "—"}</p>
              {/* Hide employer name for non-logged-in viewers — keep the
                  profession visible so the profile still communicates its
                  key context without leaking company details publicly. */}
              <p>
                {profile.profession || "—"}
                {canViewSensitiveFields && profile.companyName ? ` at ${profile.companyName}` : ""}
              </p>
              {/* Annual income (package) is a sensitive field — hidden for
                  non-logged-in viewers to discourage scraping. */}
              {canViewSensitiveFields && profile.annualIncome && <p>{profile.annualIncome}</p>}
            </DetailSection>
            <div className="py-4">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-gray-400 flex-shrink-0" />
                <p className="text-xs sm:text-sm text-gray-500">Family</p>
              </div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 auto-rows-[56px] sm:auto-rows-[60px]">
                <div className="col-span-2 rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Father
                  </p>
                  <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d] break-words">
                    {displayFatherName || "—"}
                    {profile.fatherOccupation ? ` (${profile.fatherOccupation})` : ""}
                  </p>
                </div>

                <div className="col-span-2 rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Mother
                  </p>
                  <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d] break-words">
                    {displayMotherName || "—"}
                    {profile.motherOccupation ? ` (${profile.motherOccupation})` : ""}
                  </p>
                </div>

                <div className="rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Food
                  </p>
                  <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d] break-words">
                    {profile.foodHabits || "—"}
                  </p>
                </div>

                {displaySibling && (
                  <div className="rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Sibling
                    </p>
                    <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d] break-words">
                      {displaySibling}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Horoscope block: Time of Birth is considered sensitive and is
            hidden for non-logged-in viewers. We still show the card if any
            of the remaining astrology fields are present. */}
        {(profile.rashi || profile.nakshatra || profile.timeOfBirth || profile.placeOfBirth || profile.horoscopeOtherDetails) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-[var(--foreground)] mb-1">Horoscope Details</h3>
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={18} className="text-gray-400 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-gray-500">Birth & Astrology</p>
            </div>
            <div className="grid grid-cols-2 gap-2 auto-rows-[56px] sm:auto-rows-[60px]">
              {displayTimeOfBirth && (
                <div className="rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Time of Birth
                  </p>
                  <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d] break-words">
                    {displayTimeOfBirth}
                  </p>
                </div>
              )}
              {profile.placeOfBirth && (
                <div className="rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Place of Birth
                  </p>
                  <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d] break-words">
                    {profile.placeOfBirth}
                  </p>
                </div>
              )}
              {profile.rashi && (
                <div className="rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Zodiac Sign
                  </p>
                  <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d] break-words">
                    {profile.rashi}
                  </p>
                </div>
              )}
              {profile.nakshatra && (
                <div className="rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Nakshatra
                  </p>
                  <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d] break-words">
                    {profile.nakshatra}
                  </p>
                </div>
              )}
              {profile.horoscopeOtherDetails && (
                <div className="col-span-2 rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Other Details
                  </p>
                  <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d] break-words line-clamp-2">
                    {profile.horoscopeOtherDetails}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Languages - tag-style display */}
        {((profile.languagesKnown && profile.languagesKnown.trim()) || profile.motherTongue) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-[var(--foreground)] mb-3 pb-2 border-b border-gray-200">
              Languages
            </h3>
            <div className="flex flex-wrap gap-2 pt-1">
              {(() => {
                const langs = (profile.languagesKnown || "")
                  .split(",")
                  .map((l) => l.trim())
                  .filter(Boolean);
                const motherTongue = profile.motherTongue?.trim();
                const seen = new Set<string>();
                const tags: { label: string; isMotherTongue: boolean }[] = [];
                if (motherTongue && !seen.has(motherTongue)) {
                  tags.push({ label: motherTongue, isMotherTongue: true });
                  seen.add(motherTongue);
                }
                langs.forEach((l) => {
                  if (!seen.has(l)) {
                    tags.push({ label: l, isMotherTongue: l === motherTongue });
                    seen.add(l);
                  }
                });
                return tags.map((t) => (
                  <LanguageTag
                    key={t.label}
                    label={t.label}
                    isMotherTongue={t.isMotherTongue}
                  />
                ));
              })()}
            </div>
          </div>
        )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-[var(--foreground)] mb-3">Contact Information</h3>
          <div className="py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-gray-400 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-gray-500">Address</p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 auto-rows-[56px] sm:auto-rows-[60px]">
              <div className="rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  City
                </p>
                <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d] break-words">{profile.city || "—"}</p>
              </div>
              <div className="rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  District
                </p>
                <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d] break-words">{profile.district || "—"}</p>
              </div>
              <div className="rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  State
                </p>
                <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d] break-words">{profile.state || "—"}</p>
              </div>
              <div className="rounded-lg border border-[#eee6dd] bg-[#f8f5f2] px-2.5 py-1.5 h-full">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Country
                </p>
                <p className="mt-0.5 text-[0.86rem] font-semibold text-[#2d241d] break-words">{profile.country || "—"}</p>
              </div>
            </div>
          </div>
          <div className="pt-4">
            <div className="space-y-3">
              {!isLoggedIn ? (
                <div className="rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
                  <p className="text-sm font-medium text-[var(--foreground)]">Contact Details</p>
                  <p className="mt-1 text-xs text-gray-600">
                    Phone and WhatsApp contact are visible after login.
                  </p>
                  <button
                    type="button"
                    onClick={() => openAuthModal("login")}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary)]/90 transition"
                  >
                    <Phone size={16} />
                    Login to View Contact
                  </button>
                </div>
              ) : !canUseContact ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-900">Contact Details</p>
                  <p className="mt-1 text-xs text-amber-900/90">
                    Upgrade to view phone and WhatsApp details for this profile.
                  </p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Link
                      href="/membership"
                      className="inline-flex items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      Upgrade to View Contact
                    </Link>
                    <button
                      type="button"
                      onClick={openSupportPopup}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700"
                    >
                      Contact Support
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">Contact Details</p>
                      <p className="mt-1 text-xs text-gray-600">
                        {showContact
                          ? "Contact revealed. Use responsibly for genuine matchmaking only."
                          : "Tap below to reveal phone contact details."}
                      </p>
                    </div>
                    {showContact && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Contact Revealed
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={toggleContactDetails}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary)]/90 transition"
                  >
                    <Phone size={16} />
                    {showContact ? "Hide Contact Details" : "View Contact Details"}
                  </button>
                  <p className="mt-2 text-[11px] text-gray-500">
                    For genuine matchmaking only. Misuse may lead to account blocking.
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500 mb-2">Need help? Contact our support</p>
                <div className="space-y-2">
                  <a
                    href={`tel:${(config.callContactNumber || "6360130905").replace(/\D/g, "")}`}
                    className="flex w-full items-center gap-3 rounded-xl bg-white p-2.5 text-[var(--primary)] font-medium hover:bg-gray-50 transition"
                  >
                    <Phone size={16} />
                    <span>{config.callContactNumber || "6360130905"}</span>
                    <span className="ml-auto rounded bg-[var(--primary)]/20 px-2 py-0.5 text-[11px]">Call</span>
                  </a>
                  <a
                    href={`https://wa.me/${(config.whatsappContactNumber || config.callContactNumber || "6360130905").replace(/\D/g, "")}?text=${encodeURIComponent("I need assistance with profile contact details")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center gap-3 rounded-xl bg-white p-2.5 text-[#25D366] font-medium hover:bg-gray-50 transition"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <span>{config.whatsappContactNumber || config.callContactNumber || "6360130905"}</span>
                    <span className="ml-auto rounded bg-[#25D366]/20 px-2 py-0.5 text-[11px]">WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
        {(() => {
          const isOwnProfile = !!actorId && actorId === profile.id;
          const hasPrefs = hasMeaningfulPreferences({
            partnerPreference: profile.partnerPreference,
            preferencesUpdatedAt: profile.preferencesUpdatedAt,
          });
          // Default to true when the column is missing/null on legacy rows so
          // existing profiles don't suddenly hide their preferences.
          const isPublic = profile.showPartnerPreferences !== false;

          // Owner: always show *something* — either the prefs or a CTA nudge.
          if (isOwnProfile) {
            if (hasPrefs) {
              return (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-semibold text-[var(--foreground)]">Partner Preferences</h3>
                    {!isPublic && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                        title="Only you can see your preferences"
                      >
                        <Lock size={10} />
                        Private
                      </span>
                    )}
                  </div>
                  <PartnerPreferenceTiles profile={profile} />
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">
                      {isPublic
                        ? "Visible to other members."
                        : "Hidden from other members."}
                    </p>
                    <Link
                      href="/profile/preferences"
                      className="text-xs font-semibold text-[var(--primary)] hover:underline shrink-0"
                    >
                      Edit →
                    </Link>
                  </div>
                </div>
              );
            }
            // Owner with no real preferences yet → nudge.
            return (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-dashed border-[var(--primary)]/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                    <Heart size={18} />
                  </div>
                  <h3 className="font-semibold text-[var(--foreground)]">
                    {isPublic
                      ? "Tell us what you're looking for"
                      : "Your preferences are private"}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {isPublic
                    ? "Profiles with partner preferences get more relevant matches. Takes under a minute."
                    : "Only you can see them. Make them public so others know if you're a good match."}
                </p>
                <Link
                  href="/profile/preferences"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition"
                >
                  {isPublic ? "Add Partner Preferences" : "Manage Preferences"}
                  <ChevronRight size={14} />
                </Link>
              </div>
            );
          }

          // Viewer: only show the card when prefs exist AND are public.
          if (!hasPrefs) return null;
          if (!isPublic) {
            return (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-semibold text-[var(--foreground)] mb-1">Partner Preferences</h3>
                <div className="flex items-start gap-3 mt-2">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                    <Lock size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      Preferences kept private
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      This member has chosen not to share their partner preferences publicly.
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-[var(--foreground)] mb-1">Partner Preferences</h3>
              <PartnerPreferenceTiles profile={profile} />
            </div>
          );
        })()}
      </div>

      <div className="space-y-4 mt-4">
        {hasMultiplePhotos && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-[var(--foreground)] mb-3">More Photos</h3>
            {!canViewSensitiveFields ? (
              <div className="relative">
                <div className="flex flex-wrap justify-center gap-2">
                  {allPhotos.slice(0, 4).map((src, i) => (
                    <div
                      key={i}
                      className="relative w-[calc((100%-1.5rem)/4)] max-w-[160px] aspect-square rounded-lg overflow-hidden bg-gray-200"
                    >
                      <Image
                        src={src}
                        alt={`${profile.fullName} photo ${i + 1}`}
                        fill
                        className="object-cover"
                        style={{ filter: "blur(var(--blur-md))" }}
                        unoptimized
                        sizes="(max-width: 640px) 33vw, 25vw"
                      />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg backdrop-blur-sm">
                  {!isLoggedIn ? (
                    <button
                      type="button"
                      onClick={() => openAuthModal("login")}
                      className="px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] transition shadow-lg"
                    >
                      Login to View Photos
                    </button>
                  ) : (
                    <Link
                      href="/membership"
                      className="px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] transition shadow-lg"
                    >
                      Upgrade to View Photos
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                {allPhotos.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentImageIndex(i);
                      setShowGallery(true);
                    }}
                    className="relative w-[calc((100%-1.5rem)/4)] max-w-[160px] aspect-square rounded-lg overflow-hidden bg-gray-200 hover:opacity-90 transition"
                  >
                    <Image
                      src={src}
                      alt={`${profile.fullName} photo ${i + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                      sizes="(max-width: 640px) 33vw, 25vw"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="pt-4">
          <WhatsAppGroupCta sourcePage="profile" />
        </div>

        <div className="flex gap-2 pt-4">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm sm:text-base text-gray-600 border border-[var(--border)] rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Flag size={18} className="text-gray-500" />
            Report
          </button>
          {isLoggedIn && actorId && profile && actorId !== profile.id && (
            <button
              onClick={async () => {
                if (!actorId || !profile) return;
                if (confirm("Block this user? They won't see your profile and you won't see theirs.")) {
                  await blockUser(actorId, profile.id);
                  router.push("/search");
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm sm:text-base text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
            >
              <Ban size={18} />
              Block
            </button>
          )}
        </div>

        {showReportModal && isLoggedIn && actorId && profile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Report Profile</h3>
              <p className="text-sm text-gray-600 mb-4">Help us keep the community safe. Select a reason and add details if needed.</p>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] mb-3"
              >
                <option value="">Select reason</option>
                <option value="Fake profile">Fake profile</option>
                <option value="Inappropriate content">Inappropriate content</option>
                <option value="Harassment">Harassment</option>
                <option value="Spam">Spam</option>
                <option value="Wrong information">Wrong information</option>
                <option value="Other">Other</option>
              </select>
              <textarea
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
                placeholder="Additional details (optional)"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] min-h-[80px] mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportReason("");
                    setReportMessage("");
                  }}
                  className="flex-1 py-3 rounded-xl border border-[var(--border)]"
                >
                  Cancel
                </button>
                <button
                  disabled={!reportReason.trim() || reporting}
                  onClick={async () => {
                    if (!reportReason.trim() || !actorId || !profile) return;
                    setReporting(true);
                    const { error } = await reportProfile(actorId, profile.id, reportReason.trim(), reportMessage.trim());
                    setReporting(false);
                    if (!error) {
                      setShowReportModal(false);
                      setReportReason("");
                      setReportMessage("");
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white disabled:opacity-50"
                >
                  {reporting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/*
          "More like this" results.
          Context-aware: a bride's profile should suggest more brides, and a
          groom's profile should suggest more grooms — the user can always
          switch tracks via the Brides/Grooms bottom-nav tabs. This mirrors
          how users typically browse (a matchmaker viewing female profiles
          continues to compare females; same for males).
        */}
        <div className="pt-8">
          <div className="rounded-xl border border-gray-200/90 bg-gradient-to-br from-white via-orange-50/30 to-slate-50/80 p-5 sm:p-6 lg:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-5 lg:mb-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)] mb-1">
                  Similar profiles
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] tracking-tight">
                  {profile.gender === "female"
                    ? "More brides you may like"
                    : profile.gender === "male"
                      ? "More grooms you may like"
                      : "More results for you"}
                </h3>
                <p className="text-sm text-gray-600 mt-1.5 max-w-xl">
                  Same section as this profile — open any card to compare details side by side.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
              {profiles
                .filter(
                  (p) =>
                    p.id !== profile.id &&
                    (!profile.gender || p.gender === profile.gender)
                )
                .slice(0, 6)
                .map((similar) => (
                  <ProfileCard
                    key={similar.id}
                    profile={similar}
                    displayName={
                      canViewSensitiveFields
                        ? similar.fullName
                        : isLoggedIn
                          ? maskLastName(similar.fullName)
                          : maskString(similar.fullName, 5)
                    }
                  />
                ))}
            </div>
          </div>
        </div>
        </div>
      </div>
      </div>

      {contactSheetOpen && profile && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4 px-0 pt-4 pb-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-contact-sheet-title"
        >
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-md supports-[backdrop-filter]:bg-black/35"
            aria-hidden
            onClick={() => setShowContact(false)}
          />
          <div
            className="relative z-[71] mx-3 w-[calc(100%-1.5rem)] max-w-lg sm:mx-auto sm:w-full rounded-2xl bg-white shadow-2xl border border-gray-100 max-h-[min(82vh,680px)] flex flex-col sm:max-h-[85vh] mb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2 border-b border-gray-100 shrink-0">
              <h2 id="profile-contact-sheet-title" className="text-lg font-semibold text-[var(--foreground)]">
                Contact details
              </h2>
              <button
                type="button"
                onClick={() => setShowContact(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                aria-label="Close contact details"
              >
                <X size={22} />
              </button>
            </div>
            <div className="px-4 py-3 overflow-y-auto">
              {contactHintVisible && (
                <div className="flex gap-2 items-start mb-3 rounded-xl bg-gray-50/90 border border-gray-100 px-2.5 py-2">
                  <p className="flex-1 min-w-0 text-[11px] sm:text-xs text-gray-600 leading-snug">
                    Tap outside or Close to hide. Numbers look masked; Call and WhatsApp still work.
                  </p>
                  <button
                    type="button"
                    onClick={() => setContactHintVisible(false)}
                    className="flex-shrink-0 p-1 rounded-md hover:bg-gray-200/80 text-gray-500"
                    aria-label="Dismiss hint"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <ContactsList
                contacts={profile.contacts}
                fallbackNumber={profile.contact}
                fallbackBelongsTo={profile.contactType}
              />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(6.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-8 z-[60] px-3 w-full max-w-md">
          <div
            role="status"
            className={`w-full rounded-2xl border shadow-xl backdrop-blur px-3 py-2.5 text-sm ${
              toast.type === "success"
                ? "bg-emerald-50/95 border-emerald-200 text-emerald-900"
                : "bg-rose-50/95 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5">
                {toast.type === "success" ? (
                  <Check size={16} className="text-emerald-700" />
                ) : (
                  <AlertTriangle size={16} className="text-rose-700" />
                )}
              </span>
              <p className="flex-1 leading-snug font-medium">{toast.msg}</p>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="p-1 rounded-md hover:bg-black/5 text-current"
                aria-label="Dismiss notification"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateProfileModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Create profile to continue</h3>
            <p className="mt-2 text-sm text-gray-600">
              You can browse and save profiles, but sending Interest requires at least one profile in your account.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateProfileModal(false)}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700"
              >
                Later
              </button>
              <Link
                href="/profile/complete"
                className="flex-1 rounded-xl bg-[var(--primary)] px-3 py-2 text-center text-sm font-semibold text-white"
              >
                Create profile
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
