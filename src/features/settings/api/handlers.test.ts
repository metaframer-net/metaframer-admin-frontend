import { beforeEach, describe, expect, it } from 'vitest';

import { api, ApiError } from '@/lib/api/client';
import { getAuditFor } from '@/lib/audit';
import type { Settings } from '../schemas/settings';
import { resetSettingsDb } from './handlers';

beforeEach(() => resetSettingsDb());

describe('settings handlers', () => {
  it('returns the seed settings envelope', async () => {
    const s = await api.get<Settings>('/settings');
    expect(s.general.siteName).toBe('example.net');
    expect(s.general.maintenanceMode).toBe(false);
    expect(s.flags.listingDetailMap).toBe(true);
    expect(s.layoutDefaults.mode).toBe('dock');
  });

  it('updates general settings and writes a settings.update audit entry', async () => {
    const before = getAuditFor('settings:general').length;
    const s = await api.patch<Settings>('/settings', {
      general: { siteName: 'example panel', maintenanceMode: true },
    });
    expect(s.general.siteName).toBe('example panel');
    expect(s.general.maintenanceMode).toBe(true);
    // Unchanged fields are preserved.
    expect(s.general.supportEmail).toBe('destek@example.net');
    const audit = getAuditFor('settings:general');
    expect(audit.length).toBe(before + 1);
    expect(audit[0]?.action).toBe('settings.update');
  });

  it('rejects an invalid support email (422)', async () => {
    const err = await api
      .patch<Settings>('/settings', { general: { supportEmail: 'not-an-email' } })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(422);
  });

  it('rejects an empty patch with no groups (422)', async () => {
    const err = await api.patch<Settings>('/settings', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(422);
  });

  it('disabling a flag writes a flag.disable audit entry', async () => {
    const before = getAuditFor('flag:listingDetailMap').length;
    const s = await api.patch<Settings>('/settings', { flags: { listingDetailMap: false } });
    expect(s.flags.listingDetailMap).toBe(false);
    const audit = getAuditFor('flag:listingDetailMap');
    expect(audit.length).toBe(before + 1);
    expect(audit[0]?.action).toBe('flag.disable');
  });

  it('idempotent flag toggle writes no new audit entry', async () => {
    const before = getAuditFor('flag:aiCopilotBadges').length;
    // aiCopilotBadges is already enabled in the seed; enabling again is a no-op.
    await api.patch<Settings>('/settings', { flags: { aiCopilotBadges: true } });
    expect(getAuditFor('flag:aiCopilotBadges').length).toBe(before);
  });

  it('updates layout defaults under settings:layout', async () => {
    const before = getAuditFor('settings:layout').length;
    const s = await api.patch<Settings>('/settings', { layoutDefaults: { theme: 'dark' } });
    expect(s.layoutDefaults.theme).toBe('dark');
    expect(getAuditFor('settings:layout').length).toBe(before + 1);
  });
});
