import { useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { getAuditLog } from '@/lib/audit';
import { useLayout } from '@/lib/layout/layout-context';
import { setFeatureFlags } from '@/lib/settings/feature-flags-store';
import { AuditTimeline } from '@/features/audit';
import { TwoFactorPolicySection } from '@/features/auth/components/TwoFactorPolicySection';
import { FEATURE_FLAGS, type LayoutDefaults } from '../schemas/settings';
import { useSettings, useUpdateSettings } from '../api/hooks';
import { SettingsSection } from '../components/SettingsSection';
import { GeneralSettingsForm } from '../components/GeneralSettingsForm';
import { FeatureFlagList } from '../components/FeatureFlagList';
import { LayoutDefaultsForm } from '../components/LayoutDefaultsForm';

/** Map a `settings:*` / `flag:*` resource to a Turkish label for the timeline. */
function renderSettingsResource(resource: string) {
  if (resource === 'settings:general') return 'Genel ayarlar';
  if (resource === 'settings:layout') return 'Görünüm varsayılanları';
  if (resource.startsWith('flag:')) {
    const key = resource.slice(5);
    return FEATURE_FLAGS.find((f) => f.key === key)?.label ?? resource;
  }
  return resource;
}

/** WCAG 2.2 — the shared Tabs triggers are h-9; bump to a 44px target here. */
const TAB_TRIGGER = 'min-h-11 px-3';

export function SettingsPage() {
  const { data, isLoading, isError, refetch } = useSettings();
  const update = useUpdateSettings();
  const { setMode, setDensity, setTheme } = useLayout();

  // Keep the live flag store in sync with the server settings while mounted, so
  // `useFeatureFlag` consumers reflect the current server truth.
  useEffect(() => {
    if (data) setFeatureFlags(data.flags);
  }, [data]);

  // Settings changes are audited under `settings:*` / `flag:*` — surface them here.
  const settingsAudit = getAuditLog().filter(
    (e) => e.resource.startsWith('settings:') || e.resource.startsWith('flag:'),
  );

  const applyToDevice = (defaults: LayoutDefaults) => {
    setMode(defaults.mode);
    setDensity(defaults.density);
    setTheme(defaults.theme);
  };

  return (
    <div className="space-y-6" data-entity="settings">
      <header className="animate-fade-in">
        <h1 className="text-xl font-semibold sm:text-2xl">Ayarlar</h1>
        <p className="text-muted-foreground text-sm">
          Sistem ayarları, özellik bayrakları ve görünüm varsayılanları. Değişiklikler denetim kaydına yazılır.
        </p>
      </header>

      {isError ? (
        <ErrorState
          title="Ayarlar yüklenemedi"
          description="Sistem ayarları alınamadı. Lütfen tekrar deneyin."
          onRetry={() => void refetch()}
        />
      ) : isLoading || !data ? (
        <LoadingState label="Ayarlar yükleniyor…" />
      ) : (
        <>
          <Tabs defaultValue="general" className="gap-4">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="general" className={TAB_TRIGGER}>
                Genel
              </TabsTrigger>
              <TabsTrigger value="flags" className={TAB_TRIGGER}>
                Özellik Bayrakları
              </TabsTrigger>
              <TabsTrigger value="layout" className={TAB_TRIGGER}>
                Görünüm Varsayılanları
              </TabsTrigger>
              <TabsTrigger value="security" className={TAB_TRIGGER}>
                Güvenlik
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <SettingsSection
                title="Genel / Sistem"
                description="Platform kimliği ve sistem düzeyi ayarlar."
              >
                <GeneralSettingsForm
                  defaultValues={data.general}
                  submitting={update.isPending}
                  onSubmit={(v) => update.mutate({ general: v })}
                />
              </SettingsSection>
            </TabsContent>

            <TabsContent value="flags">
              <SettingsSection
                title="Özellik Bayrakları"
                description="Deneysel veya isteğe bağlı davranışları açıp kapatın. Değişiklikler anında uygulanır."
              >
                <FeatureFlagList
                  flags={data.flags}
                  disabled={update.isPending}
                  onToggle={(key, value) => update.mutate({ flags: { [key]: value } })}
                />
              </SettingsSection>
            </TabsContent>

            <TabsContent value="layout">
              <SettingsSection
                title="Görünüm Varsayılanları"
                description="Organizasyon geneli varsayılan yerleşim/tema. Kişisel tercihiniz cihazınızda saklanır."
              >
                <LayoutDefaultsForm
                  value={data.layoutDefaults}
                  disabled={update.isPending}
                  onChange={(patch) => update.mutate({ layoutDefaults: patch })}
                  onApplyToDevice={() => applyToDevice(data.layoutDefaults)}
                />
              </SettingsSection>
            </TabsContent>

            <TabsContent value="security">
              <SettingsSection
                title="Güvenlik / İki adımlı doğrulama"
                description="Hangi rollerin iki adımlı doğrulama kullanmak zorunda olduğunu belirleyin. Yalnızca süper admin düzenleyebilir."
              >
                <TwoFactorPolicySection />
              </SettingsSection>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>Değişiklik geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTimeline
                entries={settingsAudit}
                renderResource={renderSettingsResource}
                emptyMessage="Henüz ayar değişikliği yok."
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
