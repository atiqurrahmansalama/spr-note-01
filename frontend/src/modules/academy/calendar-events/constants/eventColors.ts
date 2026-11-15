/**
 * Canonical Event Color Palette (Single Source of Truth)
 * ======================================================
 * Defines curated enterprise event & schedule colors, accessible light/dark
 * utility tokens, and legacy color alias normalization for stored records.
 *
 * Fully tuned for borderless, soft-surface aesthetics with balanced
 * luminance in both light and dark modes.
 */

export interface EventColorStyle {
  bg: string;
  solidBg: string;
  solidText: string;
  bannerBg: string;
  bannerText: string;
  border: string;
  text: string;
  dot: string;
  hex: string;
}

export interface EventColorDefinition {
  id: string;
  label: string;
  category: 'Emerald & Nature' | 'Ocean & Sky' | 'Purple & Royal' | 'Rose & Coral' | 'Amber & Earth';
  hex: string;
  rgb: string;
  style: EventColorStyle;
}

export const EVENT_COLOR_CATEGORIES = [
  'All',
  'Emerald & Nature',
  'Ocean & Sky',
  'Purple & Royal',
  'Rose & Coral',
  'Amber & Earth',
] as const;

export const EVENT_COLORS: EventColorDefinition[] = [
  // ─── 1. Emerald & Nature ──────────────────────────────────────────────────
  {
    id: 'eucalyptus',
    label: 'Eucalyptus',
    category: 'Emerald & Nature',
    hex: '#4E857B',
    rgb: 'RGB(78, 133, 123)',
    style: {
      bg: 'bg-[#E2ECE9] dark:bg-[#203632]',
      solidBg: 'bg-[#4E857B]',
      solidText: 'text-white',
      bannerBg: 'bg-[#E2ECE9] dark:bg-[#203632]',
      bannerText: 'text-[#1D443E] dark:text-[#A7D8CF]',
      border: 'border-0',
      text: 'text-[#1D443E] dark:text-[#A7D8CF]',
      dot: 'bg-[#4E857B]',
      hex: '#4E857B',
    },
  },
  {
    id: 'sage',
    label: 'Sage',
    category: 'Emerald & Nature',
    hex: '#74A381',
    rgb: 'RGB(116, 163, 129)',
    style: {
      bg: 'bg-[#E8F0EA] dark:bg-[#25392B]',
      solidBg: 'bg-[#74A381]',
      solidText: 'text-slate-950',
      bannerBg: 'bg-[#E8F0EA] dark:bg-[#25392B]',
      bannerText: 'text-[#2B4E35] dark:text-[#BDE0C7]',
      border: 'border-0',
      text: 'text-[#2B4E35] dark:text-[#BDE0C7]',
      dot: 'bg-[#74A381]',
      hex: '#74A381',
    },
  },
  {
    id: 'seafoam',
    label: 'Seafoam',
    category: 'Emerald & Nature',
    hex: '#5CA69A',
    rgb: 'RGB(92, 166, 154)',
    style: {
      bg: 'bg-[#E5F1EF] dark:bg-[#213B36]',
      solidBg: 'bg-[#5CA69A]',
      solidText: 'text-slate-950',
      bannerBg: 'bg-[#E5F1EF] dark:bg-[#213B36]',
      bannerText: 'text-[#204E47] dark:text-[#AAE2D9]',
      border: 'border-0',
      text: 'text-[#204E47] dark:text-[#AAE2D9]',
      dot: 'bg-[#5CA69A]',
      hex: '#5CA69A',
    },
  },
  {
    id: 'spruce',
    label: 'Spruce',
    category: 'Emerald & Nature',
    hex: '#3F786E',
    rgb: 'RGB(63, 120, 110)',
    style: {
      bg: 'bg-[#DFECE9] dark:bg-[#1C332F]',
      solidBg: 'bg-[#3F786E]',
      solidText: 'text-white',
      bannerBg: 'bg-[#DFECE9] dark:bg-[#1C332F]',
      bannerText: 'text-[#1A403A] dark:text-[#9FD6CD]',
      border: 'border-0',
      text: 'text-[#1A403A] dark:text-[#9FD6CD]',
      dot: 'bg-[#3F786E]',
      hex: '#3F786E',
    },
  },
  {
    id: 'mint',
    label: 'Fresh Mint',
    category: 'Emerald & Nature',
    hex: '#43C695',
    rgb: 'RGB(67, 198, 149)',
    style: {
      bg: 'bg-[#E0F7EE] dark:bg-[#1D4536]',
      solidBg: 'bg-[#43C695]',
      solidText: 'text-slate-950',
      bannerBg: 'bg-[#E0F7EE] dark:bg-[#1D4536]',
      bannerText: 'text-[#155A41] dark:text-[#97F0CD]',
      border: 'border-0',
      text: 'text-[#155A41] dark:text-[#97F0CD]',
      dot: 'bg-[#43C695]',
      hex: '#43C695',
    },
  },
  {
    id: 'teal',
    label: 'Ocean Teal',
    category: 'Emerald & Nature',
    hex: '#2C8C80',
    rgb: 'RGB(44, 140, 128)',
    style: {
      bg: 'bg-[#DCEDE9] dark:bg-[#1A3833]',
      solidBg: 'bg-[#2C8C80]',
      solidText: 'text-white',
      bannerBg: 'bg-[#DCEDE9] dark:bg-[#1A3833]',
      bannerText: 'text-[#144740] dark:text-[#8EE2D7]',
      border: 'border-0',
      text: 'text-[#144740] dark:text-[#8EE2D7]',
      dot: 'bg-[#2C8C80]',
      hex: '#2C8C80',
    },
  },

  // ─── 2. Ocean & Sky ───────────────────────────────────────────────────────
  {
    id: 'peacock',
    label: 'Peacock Azure',
    category: 'Ocean & Sky',
    hex: '#4F90BD',
    rgb: 'RGB(79, 144, 189)',
    style: {
      bg: 'bg-[#E2EDF5] dark:bg-[#1E3342]',
      solidBg: 'bg-[#4F90BD]',
      solidText: 'text-white',
      bannerBg: 'bg-[#E2EDF5] dark:bg-[#1E3342]',
      bannerText: 'text-[#1C435F] dark:text-[#A7D7FA]',
      border: 'border-0',
      text: 'text-[#1C435F] dark:text-[#A7D7FA]',
      dot: 'bg-[#4F90BD]',
      hex: '#4F90BD',
    },
  },
  {
    id: 'cerulean',
    label: 'Sky Mist',
    category: 'Ocean & Sky',
    hex: '#6AA4CC',
    rgb: 'RGB(106, 164, 204)',
    style: {
      bg: 'bg-[#E7F0F7] dark:bg-[#233847]',
      solidBg: 'bg-[#6AA4CC]',
      solidText: 'text-slate-950',
      bannerBg: 'bg-[#E7F0F7] dark:bg-[#233847]',
      bannerText: 'text-[#234A67] dark:text-[#BCE0F7]',
      border: 'border-0',
      text: 'text-[#234A67] dark:text-[#BCE0F7]',
      dot: 'bg-[#6AA4CC]',
      hex: '#6AA4CC',
    },
  },
  {
    id: 'cobalt',
    label: 'Classic Cobalt',
    category: 'Ocean & Sky',
    hex: '#5975AD',
    rgb: 'RGB(89, 117, 173)',
    style: {
      bg: 'bg-[#E4EAF5] dark:bg-[#212C42]',
      solidBg: 'bg-[#5975AD]',
      solidText: 'text-white',
      bannerBg: 'bg-[#E4EAF5] dark:bg-[#212C42]',
      bannerText: 'text-[#223354] dark:text-[#ABC5F5]',
      border: 'border-0',
      text: 'text-[#223354] dark:text-[#ABC5F5]',
      dot: 'bg-[#5975AD]',
      hex: '#5975AD',
    },
  },
  {
    id: 'glacier',
    label: 'Glacier Ice',
    category: 'Ocean & Sky',
    hex: '#4BA8DE',
    rgb: 'RGB(75, 168, 222)',
    style: {
      bg: 'bg-[#E1F1FB] dark:bg-[#1C3747]',
      solidBg: 'bg-[#4BA8DE]',
      solidText: 'text-slate-950',
      bannerBg: 'bg-[#E1F1FB] dark:bg-[#1C3747]',
      bannerText: 'text-[#184F6E] dark:text-[#A5DEFF]',
      border: 'border-0',
      text: 'text-[#184F6E] dark:text-[#A5DEFF]',
      dot: 'bg-[#4BA8DE]',
      hex: '#4BA8DE',
    },
  },
  {
    id: 'sapphire',
    label: 'Royal Sapphire',
    category: 'Ocean & Sky',
    hex: '#3B74DB',
    rgb: 'RGB(59, 116, 219)',
    style: {
      bg: 'bg-[#DFE9F9] dark:bg-[#1A2C4C]',
      solidBg: 'bg-[#3B74DB]',
      solidText: 'text-white',
      bannerBg: 'bg-[#DFE9F9] dark:bg-[#1A2C4C]',
      bannerText: 'text-[#173875] dark:text-[#A8C9FF]',
      border: 'border-0',
      text: 'text-[#173875] dark:text-[#A8C9FF]',
      dot: 'bg-[#3B74DB]',
      hex: '#3B74DB',
    },
  },

  // ─── 3. Purple & Royal ────────────────────────────────────────────────────
  {
    id: 'blueberry',
    label: 'Blueberry Indigo',
    category: 'Purple & Royal',
    hex: '#6D76C2',
    rgb: 'RGB(109, 118, 194)',
    style: {
      bg: 'bg-[#E7E9F6] dark:bg-[#252847]',
      solidBg: 'bg-[#6D76C2]',
      solidText: 'text-white',
      bannerBg: 'bg-[#E7E9F6] dark:bg-[#252847]',
      bannerText: 'text-[#282F63] dark:text-[#BAC0FA]',
      border: 'border-0',
      text: 'text-[#282F63] dark:text-[#BAC0FA]',
      dot: 'bg-[#6D76C2]',
      hex: '#6D76C2',
    },
  },
  {
    id: 'lavender',
    label: 'Soft Lavender',
    category: 'Purple & Royal',
    hex: '#8F84C2',
    rgb: 'RGB(143, 132, 194)',
    style: {
      bg: 'bg-[#ECEBF6] dark:bg-[#2B2745]',
      solidBg: 'bg-[#8F84C2]',
      solidText: 'text-white',
      bannerBg: 'bg-[#ECEBF6] dark:bg-[#2B2745]',
      bannerText: 'text-[#3B345E] dark:text-[#D1C9F7]',
      border: 'border-0',
      text: 'text-[#3B345E] dark:text-[#D1C9F7]',
      dot: 'bg-[#8F84C2]',
      hex: '#8F84C2',
    },
  },
  {
    id: 'wisteria',
    label: 'Wisteria Lilac',
    category: 'Purple & Royal',
    hex: '#A89BC9',
    rgb: 'RGB(168, 155, 201)',
    style: {
      bg: 'bg-[#F0EEF7] dark:bg-[#322C46]',
      solidBg: 'bg-[#A89BC9]',
      solidText: 'text-slate-950',
      bannerBg: 'bg-[#F0EEF7] dark:bg-[#322C46]',
      bannerText: 'text-[#453B61] dark:text-[#DDD4F7]',
      border: 'border-0',
      text: 'text-[#453B61] dark:text-[#DDD4F7]',
      dot: 'bg-[#A89BC9]',
      hex: '#A89BC9',
    },
  },
  {
    id: 'amethyst',
    label: 'Royal Amethyst',
    category: 'Purple & Royal',
    hex: '#9D78BD',
    rgb: 'RGB(157, 120, 189)',
    style: {
      bg: 'bg-[#EFE8F5] dark:bg-[#322442]',
      solidBg: 'bg-[#9D78BD]',
      solidText: 'text-white',
      bannerBg: 'bg-[#EFE8F5] dark:bg-[#322442]',
      bannerText: 'text-[#462F5C] dark:text-[#DFC6F7]',
      border: 'border-0',
      text: 'text-[#462F5C] dark:text-[#DFC6F7]',
      dot: 'bg-[#9D78BD]',
      hex: '#9D78BD',
    },
  },
  {
    id: 'grape',
    label: 'Velvet Grape',
    category: 'Purple & Royal',
    hex: '#A662AC',
    rgb: 'RGB(166, 98, 172)',
    style: {
      bg: 'bg-[#F2E5F3] dark:bg-[#361F39]',
      solidBg: 'bg-[#A662AC]',
      solidText: 'text-white',
      bannerBg: 'bg-[#F2E5F3] dark:bg-[#361F39]',
      bannerText: 'text-[#4F2554] dark:text-[#E8BAED]',
      border: 'border-0',
      text: 'text-[#4F2554] dark:text-[#E8BAED]',
      dot: 'bg-[#A662AC]',
      hex: '#A662AC',
    },
  },
  {
    id: 'plum',
    label: 'Velvet Plum',
    category: 'Purple & Royal',
    hex: '#874687',
    rgb: 'RGB(135, 70, 135)',
    style: {
      bg: 'bg-[#EEE1EE] dark:bg-[#341834]',
      solidBg: 'bg-[#874687]',
      solidText: 'text-white',
      bannerBg: 'bg-[#EEE1EE] dark:bg-[#341834]',
      bannerText: 'text-[#481E48] dark:text-[#E2AEE2]',
      border: 'border-0',
      text: 'text-[#481E48] dark:text-[#E2AEE2]',
      dot: 'bg-[#874687]',
      hex: '#874687',
    },
  },

  // ─── 4. Rose & Coral ──────────────────────────────────────────────────────
  {
    id: 'radicchio',
    label: 'Radicchio Red',
    category: 'Rose & Coral',
    hex: '#BD4E66',
    rgb: 'RGB(189, 78, 102)',
    style: {
      bg: 'bg-[#F5E3E7] dark:bg-[#3B1921]',
      solidBg: 'bg-[#BD4E66]',
      solidText: 'text-white',
      bannerBg: 'bg-[#F5E3E7] dark:bg-[#3B1921]',
      bannerText: 'text-[#5E1E2D] dark:text-[#F7B0BF]',
      border: 'border-0',
      text: 'text-[#5E1E2D] dark:text-[#F7B0BF]',
      dot: 'bg-[#BD4E66]',
      hex: '#BD4E66',
    },
  },
  {
    id: 'cherry_blossom',
    label: 'Cherry Blossom',
    category: 'Rose & Coral',
    hex: '#CC668E',
    rgb: 'RGB(204, 102, 142)',
    style: {
      bg: 'bg-[#F7E7ED] dark:bg-[#3D1C27]',
      solidBg: 'bg-[#CC668E]',
      solidText: 'text-white',
      bannerBg: 'bg-[#F7E7ED] dark:bg-[#3D1C27]',
      bannerText: 'text-[#61223A] dark:text-[#FABCD3]',
      border: 'border-0',
      text: 'text-[#61223A] dark:text-[#FABCD3]',
      dot: 'bg-[#CC668E]',
      hex: '#CC668E',
    },
  },
  {
    id: 'flamingo',
    label: 'Warm Flamingo',
    category: 'Rose & Coral',
    hex: '#DC8B8B',
    rgb: 'RGB(220, 139, 139)',
    style: {
      bg: 'bg-[#F8EBEB] dark:bg-[#402424]',
      solidBg: 'bg-[#DC8B8B]',
      solidText: 'text-slate-950',
      bannerBg: 'bg-[#F8EBEB] dark:bg-[#402424]',
      bannerText: 'text-[#613030] dark:text-[#FAD0D0]',
      border: 'border-0',
      text: 'text-[#613030] dark:text-[#FAD0D0]',
      dot: 'bg-[#DC8B8B]',
      hex: '#DC8B8B',
    },
  },
  {
    id: 'coral',
    label: 'Sunset Coral',
    category: 'Rose & Coral',
    hex: '#E2526B',
    rgb: 'RGB(226, 82, 107)',
    style: {
      bg: 'bg-[#FAE3E7] dark:bg-[#41181F]',
      solidBg: 'bg-[#E2526B]',
      solidText: 'text-white',
      bannerBg: 'bg-[#FAE3E7] dark:bg-[#41181F]',
      bannerText: 'text-[#661826] dark:text-[#F7B0BC]',
      border: 'border-0',
      text: 'text-[#661826] dark:text-[#F7B0BC]',
      dot: 'bg-[#E2526B]',
      hex: '#E2526B',
    },
  },
  {
    id: 'terracotta',
    label: 'Earth Terracotta',
    category: 'Rose & Coral',
    hex: '#C87A65',
    rgb: 'RGB(200, 122, 101)',
    style: {
      bg: 'bg-[#F6EAE6] dark:bg-[#3D231C]',
      solidBg: 'bg-[#C87A65]',
      solidText: 'text-white',
      bannerBg: 'bg-[#F6EAE6] dark:bg-[#3D231C]',
      bannerText: 'text-[#592D21] dark:text-[#F5C1B3]',
      border: 'border-0',
      text: 'text-[#592D21] dark:text-[#F5C1B3]',
      dot: 'bg-[#C87A65]',
      hex: '#C87A65',
    },
  },

  // ─── 5. Amber & Earth ─────────────────────────────────────────────────────
  {
    id: 'marigold',
    label: 'Marigold Gold',
    category: 'Amber & Earth',
    hex: '#C99A5B',
    rgb: 'RGB(201, 154, 91)',
    style: {
      bg: 'bg-[#F6EFE5] dark:bg-[#3D2D18]',
      solidBg: 'bg-[#C99A5B]',
      solidText: 'text-slate-950',
      bannerBg: 'bg-[#F6EFE5] dark:bg-[#3D2D18]',
      bannerText: 'text-[#563B19] dark:text-[#F5D8B0]',
      border: 'border-0',
      text: 'text-[#563B19] dark:text-[#F5D8B0]',
      dot: 'bg-[#C99A5B]',
      hex: '#C99A5B',
    },
  },
  {
    id: 'peach',
    label: 'Warm Peach',
    category: 'Amber & Earth',
    hex: '#E57E42',
    rgb: 'RGB(229, 126, 66)',
    style: {
      bg: 'bg-[#FAECE4] dark:bg-[#432311]',
      solidBg: 'bg-[#E57E42]',
      solidText: 'text-white',
      bannerBg: 'bg-[#FAECE4] dark:bg-[#432311]',
      bannerText: 'text-[#632E10] dark:text-[#FCC4A4]',
      border: 'border-0',
      text: 'text-[#632E10] dark:text-[#FCC4A4]',
      dot: 'bg-[#E57E42]',
      hex: '#E57E42',
    },
  },
  {
    id: 'cocoa',
    label: 'Velvet Cocoa',
    category: 'Amber & Earth',
    hex: '#8F7272',
    rgb: 'RGB(143, 114, 114)',
    style: {
      bg: 'bg-[#EFE9E9] dark:bg-[#302525]',
      solidBg: 'bg-[#8F7272]',
      solidText: 'text-white',
      bannerBg: 'bg-[#EFE9E9] dark:bg-[#302525]',
      bannerText: 'text-[#403030] dark:text-[#DACACA]',
      border: 'border-0',
      text: 'text-[#403030] dark:text-[#DACACA]',
      dot: 'bg-[#8F7272]',
      hex: '#8F7272',
    },
  },
  {
    id: 'sand',
    label: 'Desert Sand',
    category: 'Amber & Earth',
    hex: '#8F8474',
    rgb: 'RGB(143, 132, 116)',
    style: {
      bg: 'bg-[#EFECE8] dark:bg-[#2F2A23]',
      solidBg: 'bg-[#8F8474]',
      solidText: 'text-white',
      bannerBg: 'bg-[#EFECE8] dark:bg-[#2F2A23]',
      bannerText: 'text-[#3F372E] dark:text-[#DBD3C8]',
      border: 'border-0',
      text: 'text-[#3F372E] dark:text-[#DBD3C8]',
      dot: 'bg-[#8F8474]',
      hex: '#8F8474',
    },
  },
];

/** Maps historical color keys to canonical palette IDs */
export const LEGACY_COLOR_ALIAS_MAP: Record<string, string> = {
  emerald: 'eucalyptus',
  mint: 'mint',
  teal: 'teal',
  green: 'sage',
  lime: 'sage',
  sky: 'cerulean',
  cyan: 'peacock',
  ice: 'glacier',
  blue: 'cobalt',
  indigo: 'blueberry',
  violet: 'lavender',
  purple: 'amethyst',
  fuchsia: 'grape',
  rose: 'radicchio',
  red: 'radicchio',
  pink: 'cherry_blossom',
  peach: 'peach',
  coral: 'coral',
  amber: 'marigold',
  orange: 'terracotta',
  cream: 'marigold',
  slate: 'cocoa',
  sand: 'sand',
};

const CANONICAL_STYLE_BY_ID: Record<string, EventColorStyle> = EVENT_COLORS.reduce(
  (acc, item) => {
    acc[item.id] = item.style;
    return acc;
  },
  {} as Record<string, EventColorStyle>
);

/**
 * Normalizes any color identifier (canonical or legacy) to one of the canonical palette IDs.
 */
export function resolveCanonicalEventColor(
  colorId?: string | null,
  fallbackId = 'eucalyptus'
): string {
  if (colorId) {
    const normalized = String(colorId).trim().toLowerCase();
    if (CANONICAL_STYLE_BY_ID[normalized]) {
      return normalized;
    }
    const aliased = LEGACY_COLOR_ALIAS_MAP[normalized];
    if (aliased && CANONICAL_STYLE_BY_ID[aliased]) {
      return aliased;
    }
  }
  return CANONICAL_STYLE_BY_ID[fallbackId] ? fallbackId : 'eucalyptus';
}

/**
 * Full style lookup table containing all canonical keys plus legacy key aliases
 * so existing callers referencing `EVENT_COLOR_MAP[key]` always resolve safely.
 */
export const EVENT_COLOR_MAP: Record<string, EventColorStyle> = {
  ...CANONICAL_STYLE_BY_ID,
  ...Object.entries(LEGACY_COLOR_ALIAS_MAP).reduce((acc, [legacyKey, canonicalKey]) => {
    acc[legacyKey] = CANONICAL_STYLE_BY_ID[canonicalKey];
    return acc;
  }, {} as Record<string, EventColorStyle>),
};
