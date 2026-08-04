import type { Contact } from '../schemas/contact';
import type { Lead } from '../schemas/lead';
import type { Activity } from '../schemas/activity';

// ── Label maps ─────────────────────────────────────────────────────────────

export const CONTACT_TYPE_LABELS: Record<Contact['type'], string> = {
  individual: 'Bireysel',
  agent: 'Danışman',
  office: 'Ofis',
};

export const CONTACT_STATUS_LABELS: Record<Contact['status'], string> = {
  active: 'Aktif',
  inactive: 'Pasif',
  vip: 'VIP',
  churned: 'Ayrılmış',
};

export const CONTACT_SOURCE_LABELS: Record<Contact['source'], string> = {
  web: 'Web',
  referral: 'Referans',
  import: 'İçe Aktarma',
  'cold-call': 'Soğuk Arama',
  'walk-in': 'Ziyaret',
};

export const LEAD_STAGE_LABELS: Record<Lead['stage'], string> = {
  new: 'Yeni',
  contacted: 'İletişime Geçildi',
  qualified: 'Nitelikli',
  proposal: 'Teklif',
  negotiation: 'Müzakere',
  won: 'Kazanıldı',
  lost: 'Kaybedildi',
};

export const LEAD_PRIORITY_LABELS: Record<Lead['priority'], string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  urgent: 'Acil',
};

export const ACTIVITY_TYPE_LABELS: Record<Activity['type'], string> = {
  call: 'Arama',
  meeting: 'Toplantı',
  email: 'E-posta',
  note: 'Not',
  task: 'Görev',
};

// ── Seed data helpers ──────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Ahmet', 'Mehmet', 'Ali', 'Fatma', 'Ayşe', 'Elif', 'Mustafa', 'Hasan',
  'Zeynep', 'Emre', 'Burak', 'Serkan', 'Deniz', 'Gülşen', 'Cem', 'Selin',
  'Kemal', 'Derya', 'Okan', 'Pınar', 'Bora', 'Canan', 'Turgut', 'Nesrin',
];

const LAST_NAMES = [
  'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Aydın', 'Özdemir',
  'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Koç', 'Kurt', 'Öztürk',
  'Aksoy', 'Korkmaz', 'Erdoğan', 'Güneş', 'Yalçın', 'Polat', 'Taş', 'Acar',
];

const COMPANIES = [
  'Yılmaz Emlak', 'Kaya Gayrimenkul', 'Demir İnşaat', 'Çelik Yapı',
  'Anadolu Emlak', 'Marmara Gayrimenkul', 'Boğaziçi Emlak', 'Ege Yapı',
  'Akdeniz Emlak', 'Karadeniz Gayrimenkul', 'İstanbul Emlak', 'Ankara Yapı',
];

const PROVINCES = ['34', '06', '35', '16', '07', '01', '42', '41', '10', '55'];

const LEAD_TITLES = [
  'Satılık daire paketi', 'Ofis kiralama teklifi', 'Arsa satış danışmanlığı',
  'Toplu konut projesi', 'Ticari gayrimenkul değerleme', 'Yatırım danışmanlığı',
  'Villa satış kampanyası', 'Site yönetimi hizmeti', 'Emlak ofisi franchise',
  'Proje pazarlama anlaşması', 'Lüks konut satışı', 'Tarla/arazi satışı',
];

const ACTIVITY_SUBJECTS = [
  'İlk tanışma görüşmesi', 'Paket teklifi sunumu', 'Fiyat müzakeresi',
  'Sözleşme detay görüşmesi', 'Referans talebi', 'Periyodik takip',
  'Yenileme hatırlatması', 'Şikayet çözümü', 'Üst paket önerisi',
  'Memnuniyet anketi', 'Ödeme hatırlatması', 'Kampanya bilgilendirmesi',
];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randomDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  return d.toISOString();
}

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.floor(Math.random() * daysAhead) + 1);
  return d.toISOString();
}

export function seedContacts(count = 40): Contact[] {
  return Array.from({ length: count }, (_, i) => {
    const firstName = pickRandom(FIRST_NAMES);
    const lastName = pickRandom(LAST_NAMES);
    const type = (['individual', 'agent', 'office'] as const)[i % 3] as Contact['type'];
    const status = (['active', 'active', 'active', 'vip', 'inactive', 'churned'] as const)[i % 6] as Contact['status'];
    const totalListings = Math.floor(Math.random() * 50);
    return {
      id: `C-${3000 + i}`,
      userId: i % 4 === 0 ? `U-${2000 + i}` : undefined,
      fullName: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phone: `+90 5${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`,
      company: type !== 'individual' ? pickRandom(COMPANIES) : undefined,
      type,
      status,
      source: pickRandom(['web', 'referral', 'import', 'cold-call', 'walk-in'] as const) as Contact['source'],
      assigneeId: i % 3 === 0 ? 'admin-1' : undefined,
      assigneeName: i % 3 === 0 ? 'Ahmet Yönetici' : undefined,
      tags: i % 2 === 0 ? ['premium'] : i % 5 === 0 ? ['yeni', 'potansiyel'] : [],
      il: pickRandom(PROVINCES),
      totalListings,
      activeListings: Math.floor(totalListings * 0.6),
      totalRevenue: Math.floor(Math.random() * 500_000),
      lastContactedAt: i % 3 === 0 ? randomDate(30) : null,
      nextFollowUpAt: i % 4 === 0 ? futureDate(14) : null,
      notes: i % 5 === 0 ? 'Önemli müşteri, öncelikli takip.' : undefined,
      createdAt: randomDate(365),
      updatedAt: randomDate(30),
    };
  });
}

export function seedLeads(contacts: Contact[], count = 30): Lead[] {
  const activeContacts = contacts.filter((c) => c.status !== 'churned');
  return Array.from({ length: count }, (_, i) => {
    const contact = activeContacts[i % activeContacts.length] as Contact;
    const stage = pickRandom(LEAD_STAGES.filter(() => true));
    return {
      id: `L-${4000 + i}`,
      contactId: contact.id,
      contactName: contact.fullName,
      title: pickRandom(LEAD_TITLES),
      stage,
      priority: pickRandom(['low', 'medium', 'high', 'urgent'] as const),
      value: Math.floor(Math.random() * 200_000) + 5_000,
      probability: stage === 'won' ? 100 : stage === 'lost' ? 0 : Math.floor(Math.random() * 80) + 10,
      source: pickRandom(['web', 'referral', 'cold-call', 'walk-in']),
      assigneeId: contact.assigneeId,
      assigneeName: contact.assigneeName,
      expectedCloseDate: stage === 'won' || stage === 'lost' ? randomDate(60) : futureDate(60),
      lostReason: stage === 'lost' ? 'Fiyat uyumsuzluğu' : undefined,
      createdAt: randomDate(180),
      updatedAt: randomDate(14),
    };
  });
}

const LEAD_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;

export function seedActivities(contacts: Contact[], count = 60): Activity[] {
  return Array.from({ length: count }, (_, i) => {
    const contact = contacts[i % contacts.length] as Contact;
    const type = pickRandom(['call', 'meeting', 'email', 'note', 'task'] as const);
    const created = randomDate(90);
    return {
      id: `A-${5000 + i}`,
      contactId: contact.id,
      type,
      subject: pickRandom(ACTIVITY_SUBJECTS),
      description: i % 3 === 0 ? 'Detaylı görüşme notu eklendi.' : undefined,
      scheduledAt: type === 'note' ? null : created,
      completedAt: i % 2 === 0 ? created : null,
      createdBy: 'admin-1',
      createdAt: created,
    };
  });
}
