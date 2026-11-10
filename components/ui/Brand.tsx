import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, BRAND_GRADIENT } from '../../context/ThemeContext';

const MARK_TEAL = require('../../assets/brand/mark-teal.png');
const MARK_WHITE = require('../../assets/brand/mark-white.png');
const LOGO_TEAL = require('../../assets/brand/logo-horizontal-teal.png');
const LOGO_WHITE = require('../../assets/brand/logo-horizontal-white.png');

/** Source artwork ratios (from /BloomAndBump/logo). */
const MARK_RATIO = 693 / 1000;
const LOGO_RATIO = 1126 / 440;

/**
 * The official Bloom & Bump artwork. Always use these instead of re-drawing the
 * logo, so the brand stays exact. Variants pick teal or white for the theme.
 */

/** Silhouette mark only. `tone="auto"` = teal on light, white on dark. */
export function BrandMark({ height = 32, tone = 'auto' }: { height?: number; tone?: 'auto' | 'teal' | 'white' }) {
  const { isDark } = useTheme();
  const white = tone === 'white' || (tone === 'auto' && isDark);
  return (
    <Image
      source={white ? MARK_WHITE : MARK_TEAL}
      style={{ height, width: height * MARK_RATIO }}
      contentFit="contain"
      accessibilityLabel="Bloom & Bump"
    />
  );
}

/** Mark + serif wordmark, side by side. */
export function BrandLogo({ height = 40, tone = 'auto' }: { height?: number; tone?: 'auto' | 'teal' | 'white' }) {
  const { isDark } = useTheme();
  const white = tone === 'white' || (tone === 'auto' && isDark);
  return (
    <Image
      source={white ? LOGO_WHITE : LOGO_TEAL}
      style={{ height, width: height * LOGO_RATIO }}
      contentFit="contain"
      accessibilityLabel="Bloom & Bump"
    />
  );
}

/** The app-icon look: white mark on the brand gradient in a rounded square. */
export function BrandTile({ size = 56, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size * 0.26, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={BRAND_GRADIENT as unknown as [string, string, ...string[]]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <BrandMark height={size * 0.66} tone="white" />
      </LinearGradient>
    </View>
  );
}

/** Brand gradient surface for hero cards. */
export function BrandGradient({ style, children }: { style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  return (
    <LinearGradient
      colors={BRAND_GRADIENT as unknown as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}

const WORDMARK_TEAL = require('../../assets/brand/wordmark-teal.png');
const WORDMARK_WHITE = require('../../assets/brand/wordmark-white.png');
const WORDMARK_RATIO = 749 / 110;

/** Serif "Bloom & Bump" logotype only (cropped from the official horizontal logo). For top bars. */
export function BrandWordmark({ height = 20, tone = 'auto' }: { height?: number; tone?: 'auto' | 'teal' | 'white' }) {
  const { isDark } = useTheme();
  const white = tone === 'white' || (tone === 'auto' && isDark);
  return (
    <Image
      source={white ? WORDMARK_WHITE : WORDMARK_TEAL}
      style={{ height, width: height * WORDMARK_RATIO }}
      contentFit="contain"
      accessibilityLabel="Bloom & Bump"
    />
  );
}
