import { Building2, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';

import type { Contact } from '../schemas/contact';

interface PortfolioSummaryProps {
  contact: Contact;
}

export function PortfolioSummary({ contact }: PortfolioSummaryProps) {
  const metrics = [
    {
      label: 'Toplam İlan',
      value: contact.totalListings,
      icon: Building2,
    },
    {
      label: 'Aktif İlan',
      value: contact.activeListings,
      icon: BarChart3,
    },
    {
      label: 'Toplam Gelir',
      value: `₺${contact.totalRevenue.toLocaleString('tr-TR')}`,
      icon: DollarSign,
    },
    {
      label: 'Ort. Gelir/İlan',
      value: contact.totalListings > 0
        ? `₺${Math.round(contact.totalRevenue / contact.totalListings).toLocaleString('tr-TR')}`
        : '—',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4" role="region" aria-label="Portföy özeti">
      {metrics.map((m) => (
        <div key={m.label} className="bg-muted/50 rounded-lg p-3 text-center">
          <m.icon className="text-muted-foreground mx-auto mb-1 size-5" />
          <p className="text-lg font-semibold tabular-nums">{m.value}</p>
          <p className="text-muted-foreground text-xs">{m.label}</p>
        </div>
      ))}
    </div>
  );
}
