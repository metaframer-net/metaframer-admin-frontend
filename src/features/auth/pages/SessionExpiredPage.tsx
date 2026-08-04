import { useEffect } from 'react';
import { Clock } from 'lucide-react';

import { clearSessionExpired } from '@/lib/api/auth-token';
import { AuthStatusPage } from '../components/AuthStatusPage';

/** Shown after a tokened 401 (expired/revoked session). */
export function SessionExpiredPage() {
  // Consume the flag so a later fresh visit routes to /login, not back here.
  useEffect(() => {
    clearSessionExpired();
  }, []);

  return (
    <AuthStatusPage
      icon={Clock}
      title="Oturum süresi doldu"
      subtitle="Güvenliğiniz için oturumunuz sonlandırıldı."
      message="Bir süredir işlem yapılmadığı ya da oturumunuz geçersiz kaldığı için çıkış yapıldı. Devam etmek için yeniden giriş yapın."
      action={{ label: 'Yeniden giriş yap', to: '/login' }}
    />
  );
}
