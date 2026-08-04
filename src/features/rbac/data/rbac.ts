import type { Permission } from '@/lib/permissions/permissions';

/** A single grantable action within a resource group. */
export interface CatalogAction {
  permission: Permission;
  /** Short Turkish label for the action (e.g. "Onayla"). */
  label: string;
  /** One-line description surfaced via the row's FieldHelp affordance. */
  help: string;
}

/** A resource group of related permissions (one matrix section). */
export interface CatalogGroup {
  resource: string;
  /** Turkish label for the resource group (e.g. "İlanlar"). */
  label: string;
  actions: CatalogAction[];
}

/**
 * The full catalog of known `resource.action` permissions, grouped by resource.
 * This is the source of truth for the matrix editor's rows; it MUST stay in sync
 * with `docs/PERMISSIONS.md` and the seed `matrix` in `lib/permissions`.
 */
export const PERMISSION_CATALOG: CatalogGroup[] = [
  {
    resource: 'listing',
    label: 'İlanlar',
    actions: [
      { permission: 'listing.view', label: 'Görüntüle', help: 'İlan listesini ve detaylarını görme.' },
      { permission: 'listing.approve', label: 'Onayla', help: 'Bekleyen ilanı yayına alma.' },
      { permission: 'listing.reject', label: 'Reddet', help: 'İlanı reddetme (gerekçeli).' },
      { permission: 'listing.edit', label: 'Düzenle', help: 'İlan içeriğini düzenleme.' },
    ],
  },
  {
    resource: 'user',
    label: 'Kullanıcılar',
    actions: [
      { permission: 'user.view', label: 'Görüntüle', help: 'Kullanıcı listesini ve profilini görme.' },
      { permission: 'user.verify', label: 'Doğrula', help: 'Kullanıcı kimlik/telefon doğrulaması.' },
      { permission: 'user.suspend', label: 'Askıya al', help: 'Kullanıcıyı geçici olarak askıya alma.' },
      { permission: 'user.ban', label: 'Yasakla', help: 'Kullanıcıyı kalıcı olarak yasaklama.' },
      { permission: 'user.unban', label: 'Yasağı kaldır', help: 'Yasaklı kullanıcının yasağını kaldırma.' },
    ],
  },
  {
    resource: 'agent',
    label: 'Emlak Ofisleri',
    actions: [
      { permission: 'agent.verify', label: 'Doğrula', help: 'Emlak ofisi/danışman belge doğrulaması.' },
    ],
  },
  {
    resource: 'category',
    label: 'Kategoriler',
    actions: [
      { permission: 'category.manage', label: 'Yönet', help: 'Kategori ve nitelik taksonomisini yönetme.' },
    ],
  },
  {
    resource: 'location',
    label: 'Lokasyonlar',
    actions: [
      { permission: 'location.manage', label: 'Yönet', help: 'İl/ilçe/mahalle taksonomisini yönetme.' },
    ],
  },
  {
    resource: 'promotion',
    label: 'Doping',
    actions: [
      { permission: 'promotion.sell', label: 'Sat', help: 'Doping paketlerini yönetme ve satma.' },
    ],
  },
  {
    resource: 'payment',
    label: 'Ödemeler',
    actions: [
      { permission: 'payment.refund', label: 'İade', help: 'Ödeme iadesi yapma (gerekçeli).' },
    ],
  },
  {
    resource: 'message',
    label: 'Mesajlar',
    actions: [
      { permission: 'message.moderate', label: 'Modere et', help: 'Şikayet/mesaj kuyruğunu moderasyon.' },
    ],
  },
  {
    resource: 'report',
    label: 'Raporlar',
    actions: [
      { permission: 'report.view', label: 'Görüntüle', help: 'Analitik raporlarını görme.' },
    ],
  },
  {
    resource: 'audit',
    label: 'Denetim',
    actions: [
      { permission: 'audit.view', label: 'Görüntüle', help: 'Denetim kaydını (audit log) görme.' },
    ],
  },
  {
    resource: 'rbac',
    label: 'Roller & İzinler',
    actions: [
      { permission: 'rbac.manage', label: 'Yönet', help: 'Rol/izin matrisini düzenleme.' },
    ],
  },
  {
    resource: 'crm',
    label: 'CRM',
    actions: [
      { permission: 'crm.view', label: 'Görüntüle', help: 'CRM kişi ve lead listesini görme.' },
      { permission: 'crm.edit', label: 'Düzenle', help: 'Kişi ve lead oluşturma/düzenleme.' },
      { permission: 'crm.delete', label: 'Sil', help: 'Kişi veya lead silme.' },
    ],
  },
  {
    resource: 'settings',
    label: 'Ayarlar',
    actions: [
      { permission: 'settings.manage', label: 'Yönet', help: 'Sistem ayarlarını yönetme.' },
    ],
  },
];

/** Every known permission, flattened from the catalog. */
export const ALL_PERMISSIONS: Permission[] = PERMISSION_CATALOG.flatMap((g) =>
  g.actions.map((a) => a.permission),
);
