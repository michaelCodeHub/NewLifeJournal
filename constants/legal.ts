import Constants from 'expo-constants';

/**
 * Store-required legal links, from EXPO_PUBLIC_PRIVACY_URL / EXPO_PUBLIC_TERMS_URL
 * / EXPO_PUBLIC_SUPPORT_EMAIL (see app.config.js). Undefined until configured;
 * screens hide a link that isn't set rather than open a dead page.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const LEGAL = {
  privacyUrl: extra.privacyPolicyUrl || undefined,
  termsUrl: extra.termsUrl || undefined,
  supportEmail: extra.supportEmail || undefined,
};
