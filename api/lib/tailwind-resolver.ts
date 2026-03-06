/**
 * Tailwind CSS class resolver
 * Converts Tailwind utility classes to CSS property values
 */

export interface CSSProperties {
  // Layout
  display?: string;
  position?: string;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;

  // Flexbox/Grid
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: number;
  gridTemplateColumns?: string;
  gridColumn?: string;

  // Dimensions
  width?: number | string;
  height?: number | string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;

  // Spacing
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  margin?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;

  // Typography
  fontSize?: number;
  fontWeight?: number | string;
  fontStyle?: string;
  textAlign?: string;
  lineHeight?: number;
  color?: string;

  // Background
  backgroundColor?: string;

  // Border
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  borderTop?: string;
  borderBottom?: string;

  // Other
  opacity?: number;
  verticalAlign?: string;
}

/**
 * Resolve Tailwind class names to CSS properties
 */
export function resolveClassNames(className: string): CSSProperties {
  const classes = className.split(/\s+/).filter(Boolean);
  const styles: CSSProperties = {};

  classes.forEach((cls) => {
    Object.assign(styles, resolveClass(cls));
  });

  return styles;
}

/**
 * Resolve a single Tailwind class to CSS properties
 */
function resolveClass(cls: string): CSSProperties {
  // Display
  if (cls === 'flex') return { display: 'flex' };
  if (cls === 'grid') return { display: 'grid' };
  if (cls === 'block') return { display: 'block' };
  if (cls === 'inline') return { display: 'inline' };
  if (cls === 'inline-block') return { display: 'inline-block' };
  if (cls === 'hidden') return { display: 'none' };

  // Position
  if (cls === 'relative') return { position: 'relative' };
  if (cls === 'absolute') return { position: 'absolute' };
  if (cls === 'fixed') return { position: 'fixed' };
  if (cls === 'sticky') return { position: 'sticky' };

  // Flex Direction
  if (cls === 'flex-row') return { flexDirection: 'row' };
  if (cls === 'flex-col') return { flexDirection: 'column' };

  // Justify Content
  if (cls === 'justify-start') return { justifyContent: 'flex-start' };
  if (cls === 'justify-center') return { justifyContent: 'center' };
  if (cls === 'justify-end') return { justifyContent: 'flex-end' };
  if (cls === 'justify-between') return { justifyContent: 'space-between' };
  if (cls === 'justify-around') return { justifyContent: 'space-around' };

  // Align Items
  if (cls === 'items-start') return { alignItems: 'flex-start' };
  if (cls === 'items-center') return { alignItems: 'center' };
  if (cls === 'items-end') return { alignItems: 'flex-end' };
  if (cls === 'items-stretch') return { alignItems: 'stretch' };

  // Gap
  if (cls.startsWith('gap-')) {
    const value = parseSpacingValue(cls.substring(4));
    if (value !== null) return { gap: value };
  }

  // Grid Template Columns
  if (cls.startsWith('grid-cols-')) {
    const cols = parseInt(cls.substring(10));
    if (!isNaN(cols)) return { gridTemplateColumns: `repeat(${cols}, 1fr)` };
  }

  // Width
  if (cls === 'w-full') return { width: '100%' };
  if (cls === 'w-screen') return { width: '100vw' };
  if (cls === 'w-auto') return { width: 'auto' };
  if (cls.startsWith('w-')) {
    const value = parseSpacingValue(cls.substring(2));
    if (value !== null) return { width: value };
  }

  // Height
  if (cls === 'h-full') return { height: '100%' };
  if (cls === 'h-screen') return { height: '100vh' };
  if (cls === 'h-auto') return { height: 'auto' };
  if (cls.startsWith('h-')) {
    const value = parseSpacingValue(cls.substring(2));
    if (value !== null) return { height: value };
  }

  // Min/Max Width
  if (cls.startsWith('min-w-')) return { minWidth: parseSize(cls.substring(6)) };
  if (cls.startsWith('max-w-')) return { maxWidth: parseSize(cls.substring(6)) };
  if (cls.startsWith('min-h-')) return { minHeight: parseSize(cls.substring(6)) };
  if (cls.startsWith('max-h-')) return { maxHeight: parseSize(cls.substring(6)) };

  // Padding
  if (cls.startsWith('p-')) {
    const value = parseSpacingValue(cls.substring(2));
    if (value !== null) return { padding: value };
  }
  if (cls.startsWith('px-')) {
    const value = parseSpacingValue(cls.substring(3));
    if (value !== null) return { paddingLeft: value, paddingRight: value };
  }
  if (cls.startsWith('py-')) {
    const value = parseSpacingValue(cls.substring(3));
    if (value !== null) return { paddingTop: value, paddingBottom: value };
  }
  if (cls.startsWith('pt-')) {
    const value = parseSpacingValue(cls.substring(3));
    if (value !== null) return { paddingTop: value };
  }
  if (cls.startsWith('pr-')) {
    const value = parseSpacingValue(cls.substring(3));
    if (value !== null) return { paddingRight: value };
  }
  if (cls.startsWith('pb-')) {
    const value = parseSpacingValue(cls.substring(3));
    if (value !== null) return { paddingBottom: value };
  }
  if (cls.startsWith('pl-')) {
    const value = parseSpacingValue(cls.substring(3));
    if (value !== null) return { paddingLeft: value };
  }

  // Margin
  if (cls.startsWith('m-')) {
    const value = parseSpacingValue(cls.substring(2));
    if (value !== null) return { margin: value };
  }
  if (cls.startsWith('mx-')) {
    const value = parseSpacingValue(cls.substring(3));
    if (value !== null) return { marginLeft: value, marginRight: value };
  }
  if (cls.startsWith('my-')) {
    const value = parseSpacingValue(cls.substring(3));
    if (value !== null) return { marginTop: value, marginBottom: value };
  }
  if (cls.startsWith('mt-')) {
    const value = parseSpacingValue(cls.substring(3));
    if (value !== null) return { marginTop: value };
  }
  if (cls.startsWith('mb-')) {
    const value = parseSpacingValue(cls.substring(3));
    if (value !== null) return { marginBottom: value };
  }

  // Font Size
  if (cls === 'text-xs') return { fontSize: 12 };
  if (cls === 'text-sm') return { fontSize: 14 };
  if (cls === 'text-base') return { fontSize: 16 };
  if (cls === 'text-lg') return { fontSize: 18 };
  if (cls === 'text-xl') return { fontSize: 20 };
  if (cls === 'text-2xl') return { fontSize: 24 };
  if (cls === 'text-3xl') return { fontSize: 30 };
  if (cls === 'text-4xl') return { fontSize: 36 };
  if (cls === 'text-5xl') return { fontSize: 48 };
  if (cls === 'text-6xl') return { fontSize: 60 };

  // Font Weight
  if (cls === 'font-thin') return { fontWeight: 100 };
  if (cls === 'font-extralight') return { fontWeight: 200 };
  if (cls === 'font-light') return { fontWeight: 300 };
  if (cls === 'font-normal') return { fontWeight: 400 };
  if (cls === 'font-medium') return { fontWeight: 500 };
  if (cls === 'font-semibold') return { fontWeight: 600 };
  if (cls === 'font-bold') return { fontWeight: 700 };
  if (cls === 'font-extrabold') return { fontWeight: 800 };
  if (cls === 'font-black') return { fontWeight: 900 };

  // Font Style
  if (cls === 'italic') return { fontStyle: 'italic' };
  if (cls === 'not-italic') return { fontStyle: 'normal' };

  // Text Align
  if (cls === 'text-left') return { textAlign: 'left' };
  if (cls === 'text-center') return { textAlign: 'center' };
  if (cls === 'text-right') return { textAlign: 'right' };
  if (cls === 'text-justify') return { textAlign: 'justify' };

  // Text Color
  if (cls.startsWith('text-')) {
    const color = parseColor(cls.substring(5));
    if (color) return { color };
  }

  // Background Color
  if (cls.startsWith('bg-')) {
    const color = parseColor(cls.substring(3));
    if (color) return { backgroundColor: color };
  }

  // Border
  if (cls.startsWith('border-')) {
    const rest = cls.substring(7);
    if (rest === 'none' || rest === '0') return { borderWidth: 0 };
    if (rest === '' || rest === '1') return { borderWidth: 1 };
    if (rest === '2') return { borderWidth: 2 };
    if (rest === '4') return { borderWidth: 4 };
    if (rest === '8') return { borderWidth: 8 };

    // Border color
    const color = parseColor(rest);
    if (color) return { borderColor: color };
  }
  if (cls === 'border') return { borderWidth: 1 };

  // Border Radius
  if (cls === 'rounded-none') return { borderRadius: 0 };
  if (cls === 'rounded-sm') return { borderRadius: 2 };
  if (cls === 'rounded') return { borderRadius: 4 };
  if (cls === 'rounded-md') return { borderRadius: 6 };
  if (cls === 'rounded-lg') return { borderRadius: 8 };
  if (cls === 'rounded-xl') return { borderRadius: 12 };
  if (cls === 'rounded-2xl') return { borderRadius: 16 };
  if (cls === 'rounded-3xl') return { borderRadius: 24 };
  if (cls === 'rounded-full') return { borderRadius: 9999 };

  // Inset (for absolute positioning)
  if (cls.startsWith('top-')) {
    const value = parseSpacingValue(cls.substring(4));
    if (value !== null) return { top: value };
  }
  if (cls.startsWith('right-')) {
    const value = parseSpacingValue(cls.substring(6));
    if (value !== null) return { right: value };
  }
  if (cls.startsWith('bottom-')) {
    const value = parseSpacingValue(cls.substring(7));
    if (value !== null) return { bottom: value };
  }
  if (cls.startsWith('left-')) {
    const value = parseSpacingValue(cls.substring(5));
    if (value !== null) return { left: value };
  }

  return {};
}

/**
 * Parse Tailwind spacing value (0, 0.5, 1, 2, 3, 4, 6, 8, 12, 16, etc.)
 * Returns pixels (multiply by 4)
 */
function parseSpacingValue(value: string): number | null {
  // Handle fractions like 0.5
  if (value.includes('.')) {
    const num = parseFloat(value);
    if (!isNaN(num)) return num * 4;
  }

  // Handle integers
  const num = parseInt(value);
  if (!isNaN(num)) return num * 4;

  return null;
}

/**
 * Parse size values (screen, full, auto, etc.)
 */
function parseSize(value: string): number {
  if (value === 'screen') return 960; // Assume 960px canvas
  if (value === 'full') return 960;

  const num = parseInt(value);
  if (!isNaN(num)) return num * 4;

  return 0;
}

/**
 * Parse Tailwind color to hex
 */
function parseColor(colorClass: string): string | null {
  // Arbitrary value: bg-[#4a5fa5] or text-[#fff]
  const arbitraryMatch = colorClass.match(/\[#([0-9A-Fa-f]{3,6})\]/);
  if (arbitraryMatch) {
    return '#' + arbitraryMatch[1];
  }

  // Tailwind color palette
  const colorMap: Record<string, string> = {
    // Gray
    'gray-50': '#F9FAFB',
    'gray-100': '#F3F4F6',
    'gray-200': '#E5E7EB',
    'gray-300': '#D1D5DB',
    'gray-400': '#9CA3AF',
    'gray-500': '#6B7280',
    'gray-600': '#4B5563',
    'gray-700': '#374151',
    'gray-800': '#1F2937',
    'gray-900': '#111827',
    'gray-950': '#030712',

    // Red
    'red-400': '#F87171',
    'red-500': '#EF4444',
    'red-600': '#DC2626',

    // Green
    'green-400': '#4ADE80',
    'green-500': '#22C55E',
    'green-600': '#16A34A',

    // Blue
    'blue-300': '#93C5FD',
    'blue-400': '#60A5FA',
    'blue-500': '#3B82F6',
    'blue-600': '#2563EB',

    // Yellow
    'yellow-400': '#FACC15',
    'yellow-500': '#EAB308',

    // Purple
    'purple-500': '#A855F7',

    // Indigo
    'indigo-500': '#6366F1',

    // Named colors
    'white': '#FFFFFF',
    'black': '#000000',
    'transparent': 'transparent',
  };

  return colorMap[colorClass] || null;
}
