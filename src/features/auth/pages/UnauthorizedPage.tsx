import { ShieldAlert } from 'lucide-react';

import { AuthStatusPage } from '../components/AuthStatusPage';

/**
 * Standalone 403 (outside the app shell). The in-shell RBAC 403 (`ForbiddenPage`)
 * stays the primary experience; this covers direct hits / redirects with no shell.
 */
export function UnauthorizedPage() {
  return (
    <AuthStatusPage
      icon={ShieldAlert}
      iconTone="destructive"
      title="Erişim yetkiniz yok (403)"
      subtitle="Bu sayfayı görüntüleme izniniz yok."
      message="Bu kaynağa erişmek için gerekli izne sahip değilsiniz. Yetki gerekiyorsa yöneticinizle iletişime geçin."
      action={{ label: "Genel Bakış'a dön", to: '/' }}
      secondary={{ label: 'Girişe dön', to: '/login' }}
    />
  );
}
