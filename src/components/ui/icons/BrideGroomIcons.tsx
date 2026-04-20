import type { SVGProps } from "react";

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number;
  strokeWidth?: number;
}

/**
 * BrideIcon — South-Asian bride silhouette designed to read at 18–24px.
 *
 * Visual language:
 *   • Draped dupatta forming a soft peak above the head (matrimonial cue)
 *   • Maang-tikka teardrop hanging at the centre of the forehead
 *   • V-neck saree/lehenga flare below the shoulders
 *
 * Pairs with `GroomIcon` — both fit inside a 24×24 viewBox with identical
 * optical weight so they balance visually when placed side-by-side in nav.
 */
export function BrideIcon({
  size = 24,
  strokeWidth = 1.8,
  ...rest
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {/* Dupatta — flowing drape that peaks above the head and falls past the
          shoulders on either side. Drawn as one continuous path so it reads
          as a single piece of fabric. */}
      <path d="M4 15 Q 3 8 7 5 Q 12 2 17 5 Q 21 8 20 15" />
      {/* Dupatta side-falls that trail down past the shoulders */}
      <path d="M4 15 Q 3.5 19 5 22" />
      <path d="M20 15 Q 20.5 19 19 22" />
      {/* Head */}
      <circle cx="12" cy="10" r="2.6" />
      {/* Maang-tikka teardrop at the hairline (stroke + filled dot) */}
      <path d="M12 6.6 V 8" />
      <circle cx="12" cy="8.3" r="0.55" fill="currentColor" stroke="none" />
      {/* Saree / blouse silhouette — V-neckline flaring outward at the hem */}
      <path d="M8.5 13.5 L 12 12.8 L 15.5 13.5 L 17 22 L 7 22 Z" />
    </svg>
  );
}

/**
 * GroomIcon — South-Asian groom silhouette designed to read at 18–24px.
 *
 * Visual language:
 *   • Traditional pagdi / turban with a small kalgi (feather) accent on top
 *   • Head below the turban with neutral expression
 *   • Sherwani collar forming a clean V at the neck, broad shoulders below
 *
 * Pairs with `BrideIcon` — both fit inside a 24×24 viewBox and share the
 * same stroke weight so they look balanced side-by-side.
 */
export function GroomIcon({
  size = 24,
  strokeWidth = 1.8,
  ...rest
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {/* Kalgi / feather accent on top of the pagdi */}
      <path d="M12 1.5 V 3.3" />
      <circle cx="12" cy="1.2" r="0.55" fill="currentColor" stroke="none" />
      {/* Pagdi / turban — domed crown with a front wrap line */}
      <path d="M5.5 8.5 Q 5 3.5 12 3.2 Q 19 3.5 18.5 8.5 Z" />
      <path d="M7 7.5 Q 12 6 17 7.5" />
      {/* Head below the turban */}
      <path d="M8.5 8.5 V 11 a 3.5 3.5 0 0 0 7 0 V 8.5" />
      {/* Sherwani collar — V neckline */}
      <path d="M9 14.5 L 12 16 L 15 14.5" />
      {/* Shoulders / coat torso */}
      <path d="M4 22 V 18 Q 7.5 14.5 12 14.5 Q 16.5 14.5 20 18 V 22" />
    </svg>
  );
}
