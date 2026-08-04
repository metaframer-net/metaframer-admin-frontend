import { TriangleAlert } from 'lucide-react';

import { AuthStatusPage } from '../components/AuthStatusPage';

/** Generic auth fallback for unexpected errors during a sign-in flow. */
export function AuthErrorPage() {
  return (
    <AuthStatusPage
      icon={TriangleAlert}
      iconTone="warning"
      title="Bir sorun oluştu"
      subtitle="Giriş sırasında beklenmedik bir hata oluştu."
      message="İşleminiz tamamlanamadı. Lütfen tekrar deneyin; sorun sürerse BT ekibiyle iletişime geçin."
      action={{ label: 'Girişe dön', to: '/login' }}
    />
  );
}
