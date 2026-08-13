import type { GeneralSettings, Settings } from '../schemas/settings';
import { DEFAULT_FLAGS, DEFAULT_LAYOUT_DEFAULTS } from '../schemas/settings';

/** Seed general/system values (sensible defaults for the example.net panel). */
export const DEFAULT_GENERAL: GeneralSettings = {
  siteName: 'example.net',
  supportEmail: 'destek@example.net',
  defaultLocale: 'tr',
  maintenanceMode: false,
};

/** The full seed settings envelope used by the mock server + resets. */
export function buildSeedSettings(): Settings {
  return {
    general: { ...DEFAULT_GENERAL },
    flags: { ...DEFAULT_FLAGS },
    layoutDefaults: { ...DEFAULT_LAYOUT_DEFAULTS },
  };
}

/** Tab groups shown on the settings page. */
export const SETTINGS_GROUPS = [
  { id: 'general', label: 'Genel' },
  { id: 'flags', label: 'Özellik Bayrakları' },
  { id: 'layout', label: 'Görünüm Varsayılanları' },
] as const;
export type SettingsGroupId = (typeof SETTINGS_GROUPS)[number]['id'];
