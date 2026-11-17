import React from 'react';
import { Ionicons } from '@expo/vector-icons';

/**
 * The app's single icon set: Ionicons (Expo's built-in, iOS-style), always the
 * line ("-outline") version, at one of three sizes (Linear-style: no filled
 * icons anywhere; selection is shown with colour). Every feature has exactly one icon in this registry —
 * screens never pick glyphs ad hoc.
 *
 * Keys are the app's semantic names; values are Ionicons base names.
 */
const REGISTRY = {
  // navigation & chrome
  home: 'home',
  grid: 'grid',
  'calendar-clear': 'calendar-clear',
  calendar: 'calendar',
  'calendar-number': 'calendar-number',
  'calendar-check': 'calendar',
  sparkles: 'sparkles',
  'person-circle': 'person-circle',
  person: 'person',
  'chevron-back': 'chevron-back',
  // Android top app bar back (Material).
  'arrow-back': 'arrow-back',
  'chevron-forward': 'chevron-forward',
  'chevron-down': 'chevron-down',
  close: 'close',
  add: 'add',
  'add-circle': 'add-circle',
  remove: 'remove',
  checkmark: 'checkmark',
  'checkmark-circle': 'checkmark-circle',
  'checkmark-done': 'checkmark-done',
  checkbox: 'checkbox',
  'ellipsis-horizontal': 'ellipsis-horizontal',
  'ellipsis-horizontal-circle': 'ellipsis-horizontal-circle',
  ellipse: 'ellipse',
  'radio-button-on': 'radio-button-on',
  'radio-button-off': 'radio-button-off',
  search: 'search',
  refresh: 'refresh',
  'arrow-up': 'arrow-up',
  'arrow-down': 'arrow-down',
  'arrow-up-circle': 'arrow-up-circle',
  'arrow-undo': 'arrow-undo',
  create: 'create',
  'note-pencil': 'create',
  trash: 'trash',
  share: 'share',
  'share-social': 'share-social',
  download: 'download',
  print: 'print',
  attach: 'attach',
  send: 'send',
  settings: 'settings',
  construct: 'construct',
  'log-out': 'log-out',
  'lock-closed': 'lock-closed',
  'shield-checkmark': 'shield-checkmark',
  key: 'key',
  eye: 'eye',
  'eye-off': 'eye-off',
  'information-circle': 'information-circle',
  'help-circle': 'help-circle',
  'alert-circle': 'alert-circle',
  notifications: 'notifications',
  'notifications-off': 'notifications-off',
  'mail-unread': 'mail-unread',
  'cloud-offline': 'cloud-offline',
  'cloud-upload': 'cloud-upload',
  cloud: 'cloud',
  cloudy: 'cloudy',
  'logo-google': 'logo-google',
  call: 'call',
  location: 'location',
  pricetag: 'pricetag',
  list: 'list',
  flag: 'flag',
  ban: 'ban',
  hourglass: 'hourglass',
  time: 'time',
  'swap-horizontal': 'swap-horizontal',
  star: 'star',
  play: 'play',
  pause: 'pause',
  stop: 'stop',
  'stop-circle': 'stop-circle',
  image: 'image',
  images: 'images',
  camera: 'camera',
  document: 'document',
  'document-text': 'document-text',
  clipboard: 'clipboard',
  book: 'book',
  'person-add': 'person-add',
  people: 'people',
  chatbubble: 'chatbubble',
  'chatbubble-ellipses': 'chatbubble-ellipses',
  chatbubbles: 'chatbubbles',
  heart: 'heart',
  business: 'business',
  leaf: 'leaf',
  happy: 'happy',
  baby: 'happy',
  // health & features — one icon per feature
  medkit: 'medkit',
  stethoscope: 'medkit',
  thermometer: 'thermometer',
  footsteps: 'footsteps',
  timer: 'timer',
  'stats-chart': 'stats-chart',
  analytics: 'analytics',
  pulse: 'pulse',
  heartbeat: 'pulse',
  flask: 'flask',
  scan: 'scan',
  water: 'water',
  nutrition: 'nutrition',
  medical: 'medical',
  bandage: 'bandage',
  walk: 'walk',
  body: 'body',
  moon: 'moon',
  bed: 'bed',
  'battery-dead': 'battery-dead',
  flash: 'flash',
  flame: 'flame',
  sad: 'sad',
  scale: 'scale',
  resize: 'resize',
  barbell: 'barbell',
  shirt: 'shirt',
  'bag-handle': 'bag-handle',
  car: 'car',
} as const;

type Base = keyof typeof REGISTRY;
/** `home-outline` = line (the default look). Bare `home` = filled, used only for a selected tab. */
export type IconName = Base | `${Base}-outline`;

/** The only three icon sizes in the app. */
export const ICON_SIZE = { sm: 16, md: 20, lg: 22 } as const;

/** Snap any requested size to the nearest of the three, so sizes can't drift per screen. */
const snap = (s: number) => (s <= 17 ? ICON_SIZE.sm : s <= 20 ? ICON_SIZE.md : ICON_SIZE.lg);

export type IconWeight = 'regular' | 'fill';

export interface IconProps {
  name: IconName;
  /** Snapped to 16 / 20 / 22. Defaults to 20. */
  size?: number;
  color?: string;
  /** Force line or filled. Default: line, unless a bare name is passed (selected tab). */
  weight?: IconWeight;
  style?: any;
  /** Icons are decorative by default; label only standalone meaningful icons. */
  accessibilityLabel?: string;
}

// Selected states that have a filled variant (active tabs, liked). Everything else is always line.
const FILLABLE = new Set<Base>(['home', 'calendar-clear', 'chatbubble-ellipses', 'person-circle', 'grid', 'heart', 'sparkles']);

export function Icon({ name, size = ICON_SIZE.md, color, weight, style, accessibilityLabel }: IconProps) {
  const isOutline = name.endsWith('-outline');
  const base = (isOutline ? name.slice(0, -'-outline'.length) : name) as Base;
  const ion: string = REGISTRY[base] ?? 'ellipse';
  const filled = weight === 'fill' || (weight !== 'regular' && !isOutline && FILLABLE.has(base));
  const glyph = (filled || ion === 'logo-google' ? ion : `${ion}-outline`) as keyof typeof Ionicons.glyphMap;
  return (
    <Ionicons
      name={glyph}
      size={snap(size)}
      color={color}
      style={style}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

/** True if a string is a known icon name (for data-driven icons). */
export const isIconName = (s: string): s is IconName =>
  (s.endsWith('-outline') ? s.slice(0, -8) : s) in REGISTRY;
