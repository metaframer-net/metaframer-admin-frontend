import { http, HttpResponse } from 'msw';

import { API_BASE_URL } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import { writeAudit } from '@/lib/audit';
import { CATEGORIES, LOCATIONS, HEATING, DEED_STATUS } from '../data/taxonomy';
import type { AiSuggestion, Listing, ModerationDecision } from '../schemas/listing';
import { STATUSES } from '../data/taxonomy';

const AI: AiSuggestion[] = ['ok', 'uncertain', 'nok'];
const ilKeys = Object.keys(LOCATIONS);

function seed(): Listing[] {
  const rows: Listing[] = [];
  for (let i = 0; i < 60; i += 1) {
    const category = CATEGORIES[i % CATEGORIES.length]!;
    const il = ilKeys[i % ilKeys.length]!;
    const districts = Object.keys(LOCATIONS[il]!.districts);
    const ilce = districts[i % districts.length]!;
    const neighborhoods = LOCATIONS[il]!.districts[ilce]!.neighborhoods;
    const mahalle = neighborhoods[i % neighborhoods.length]!;
    const status = STATUSES[i % STATUSES.length]!;
    rows.push({
      id: `L-${1000 + i}`,
      title: `${LOCATIONS[il]!.label} ${category} ilanı ${i + 1}`,
      description: 'Örnek açıklama metni. Bu ilan mock veridir.',
      category,
      status,
      price: 750_000 + (i % 30) * 150_000,
      il,
      ilce,
      mahalle,
      attributes: {
        grossArea: 70 + (i % 20) * 10,
        netArea: 60 + (i % 20) * 9,
        rooms: `${1 + (i % 4)}+1`,
        buildingAge: i % 25,
        floor: i % 12,
        heating: HEATING[i % HEATING.length],
        deedStatus: DEED_STATUS[i % DEED_STATUS.length],
        ...(category === 'arsa' ? { zoning: 'konut' } : {}),
      },
      agentName: `Emlak Ofisi ${1 + (i % 8)}`,
      aiSuggestion: AI[i % AI.length]!,
      aiReasons:
        AI[i % AI.length] === 'nok'
          ? ['Eksik tapu bilgisi', 'Fiyat piyasa dışı']
          : AI[i % AI.length] === 'uncertain'
            ? ['Fotoğraf sayısı az']
            : ['Kurallara uygun'],
      createdAt: new Date(2026, 5, 1 + (i % 28)).toISOString(),
    });
  }
  return rows;
}

let db: Listing[] = seed();

/** Reset the mock DB (tests). */
export function resetListingsDb() {
  db = seed();
}

/** Current snapshot of the mock DB (read-only; used by dashboard stats). */
export function getListingsSnapshot(): Listing[] {
  return [...db];
}

function applyQuery(url: URL): Paginated<Listing> {
  const page = Number(url.searchParams.get('page') ?? '1');
  const pageSize = Number(url.searchParams.get('pageSize') ?? '25');
  const q = url.searchParams.get('q')?.toLocaleLowerCase('tr') ?? '';
  const statuses = url.searchParams.getAll('status');
  const categories = url.searchParams.getAll('category');
  const ais = url.searchParams.getAll('ai');
  const il = url.searchParams.get('il');
  const priceMin = url.searchParams.get('priceMin');
  const priceMax = url.searchParams.get('priceMax');
  const sortRaw = url.searchParams.get('sort');

  let items = db.filter((l) => {
    if (q && !l.title.toLocaleLowerCase('tr').includes(q)) return false;
    if (statuses.length && !statuses.includes(l.status)) return false;
    if (categories.length && !categories.includes(l.category)) return false;
    if (ais.length && !ais.includes(l.aiSuggestion)) return false;
    if (il && l.il !== il) return false;
    if (priceMin && l.price < Number(priceMin)) return false;
    if (priceMax && l.price > Number(priceMax)) return false;
    return true;
  });

  if (sortRaw) {
    const [field, dir] = sortRaw.split(',')[0]!.split(':');
    items = [...items].sort((a, b) => {
      const av = a[field as keyof Listing] as string | number;
      const bv = b[field as keyof Listing] as string | number;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return dir === 'desc' ? -cmp : cmp;
    });
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page, pageSize };
}

export const listingsHandlers = [
  http.get(`${API_BASE_URL}/listings`, ({ request }) => HttpResponse.json(applyQuery(new URL(request.url)))),

  // Aggregate KPI counts. Registered BEFORE `/listings/:id` so `/stats` is not
  // captured by the `:id` param route.
  http.get(`${API_BASE_URL}/listings/stats`, () =>
    HttpResponse.json({
      total: db.length,
      pending: db.filter((l) => l.status === 'pending').length,
      aiNok: db.filter((l) => l.aiSuggestion === 'nok').length,
      active: db.filter((l) => l.status === 'active').length,
    }),
  ),

  http.get(`${API_BASE_URL}/listings/:id`, ({ params }) => {
    const listing = db.find((l) => l.id === params.id);
    return listing ? HttpResponse.json(listing) : new HttpResponse(null, { status: 404 });
  }),

  http.post(`${API_BASE_URL}/listings`, async ({ request }) => {
    const body = (await request.json()) as Partial<Listing>;
    const listing: Listing = {
      id: `L-${1000 + db.length}`,
      title: body.title ?? 'Yeni ilan',
      description: body.description ?? '',
      category: body.category ?? 'konut',
      status: 'pending',
      price: body.price ?? 0,
      il: body.il ?? '',
      ilce: body.ilce ?? '',
      mahalle: body.mahalle ?? '',
      attributes: body.attributes ?? {},
      agentName: body.agentName ?? 'Bilinmeyen Ofis',
      aiSuggestion: 'uncertain',
      aiReasons: ['Yeni ilan — inceleme bekliyor'],
      createdAt: new Date(2026, 6, 24).toISOString(),
    };
    db.unshift(listing);
    return HttpResponse.json(listing, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/listings/:id`, async ({ params, request }) => {
    const idx = db.findIndex((l) => l.id === params.id);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    const patch = (await request.json()) as Partial<Listing>;
    db[idx] = { ...db[idx]!, ...patch };
    return HttpResponse.json(db[idx]);
  }),

  http.post(`${API_BASE_URL}/listings/:id/moderate`, async ({ params, request }) => {
    const idx = db.findIndex((l) => l.id === params.id);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    const { decision, reason, actor } = (await request.json()) as {
      decision: ModerationDecision;
      reason?: string;
      actor?: string;
    };
    const before = db[idx]!;
    const nextStatus: Listing['status'] =
      decision === 'ok' ? 'active' : decision === 'nok' ? 'rejected' : 'pending';
    const after: Listing = { ...before, status: nextStatus };
    db[idx] = after;
    writeAudit({
      // Human decisions default to the current user; the AI copilot passes an
      // `ai:<agent>` actor so its approvals are attributable in the audit log.
      actor: actor ?? 'user:current',
      action: `listing.${decision === 'ok' ? 'approve' : decision === 'nok' ? 'reject' : 'hold'}`,
      resource: `listing:${before.id}`,
      before: { status: before.status },
      after: { status: nextStatus, reason },
    });
    return HttpResponse.json(after);
  }),
];
