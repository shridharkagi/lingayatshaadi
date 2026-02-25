"use client";

import {
  Dumbbell,
  UtensilsCrossed,
  Mountain,
  Film,
  Plane,
  BookOpen,
  Music,
  ChefHat,
  Camera,
  Flower2,
  Trophy,
  Music2,
  Leaf,
  Palette,
  PenLine,
} from "lucide-react";

const HOBBY_ICONS: Record<string, React.ElementType> = {
  "working out": Dumbbell,
  "working-out": Dumbbell,
  foodie: UtensilsCrossed,
  trekking: Mountain,
  movies: Film,
  travelling: Plane,
  traveling: Plane,
  reading: BookOpen,
  music: Music2,
  cooking: ChefHat,
  photography: Camera,
  yoga: Flower2,
  sports: Trophy,
  dancing: Music2,
  gardening: Leaf,
  art: Palette,
  writing: PenLine,
};

function getIconForHobby(label: string): React.ElementType {
  const key = label.toLowerCase().trim();
  const keyDash = key.replace(/\s+/g, "-");
  return HOBBY_ICONS[key] ?? HOBBY_ICONS[keyDash] ?? BookOpen;
}

export function HobbyTag({ label }: { label: string }) {
  const Icon = getIconForHobby(label);
  return (
    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-gray-50/80 text-gray-800 text-sm font-medium">
      <Icon size={16} className="text-[var(--primary)] flex-shrink-0" />
      {label}
    </span>
  );
}
