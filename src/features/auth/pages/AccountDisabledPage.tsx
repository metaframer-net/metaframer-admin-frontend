import { Ban } from 'lucide-react';

import { AuthStatusPage } from '../components/AuthStatusPage';

/** Shown when a suspended/disabled admin tries to sign in. */
export function AccountDisabledPage() {
  return (
    <AuthStatusPage
      icon={Ban}
      iconTone="destructive"
      title="Hesabınız askıya alınmış"
      subtitle="Bu hesaba şu anda erişilemiyor."
      message="Hesabınız bir yönetici tarafından askıya alınmış. Erişimi yeniden açtırmak için BT ekibiyle veya yöneticinizle iletişime geçin."
      action={{ label: 'Girişe dön', to: '/login' }}
    />
  );
}
