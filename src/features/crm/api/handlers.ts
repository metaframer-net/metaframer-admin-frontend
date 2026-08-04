import { http, HttpResponse } from 'msw';

import { API_BASE_URL } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import { writeAudit } from '@/lib/audit';
import type { Contact } from '../schemas/contact';
import type { Lead } from '../schemas/lead';
import type { Activity } from '../schemas/activity';
import { seedContacts, seedLeads, seedActivities } from '../data/crm';

// ── In-memory stores ───────────────────────────────────────────────────────

const contacts: Contact[] = seedContacts();
const leads: Lead[] = seedLeads(contacts);
const activities: Activity[] = seedActivities(contacts);

let contactSeq = contacts.length;
let leadSeq = leads.length;
let activitySeq = activities.length;

// ── Helpers ────────────────────────────────────────────────────────────────

function multiParam(url: URL, key: string): string[] {
  return url.searchParams.getAll(key).filter(Boolean);
}

function applyContactQuery(url: URL): Paginated<Contact> {
  const page = Number(url.searchParams.get('page') ?? '1');
  const pageSize = Number(url.searchParams.get('pageSize') ?? '25');
  const q = (url.searchParams.get('q') ?? '').toLocaleLowerCase('tr-TR');
  const statuses = multiParam(url, 'status');
  const types = multiParam(url, 'type');
  const sources = multiParam(url, 'source');
  const revenueMin = url.searchParams.get('revenueMin');
  const revenueMax = url.searchParams.get('revenueMax');
  const sort = url.searchParams.get('sort');

  let filtered = [...contacts];

  if (q) filtered = filtered.filter((c) => c.fullName.toLocaleLowerCase('tr-TR').includes(q) || c.email.toLocaleLowerCase('tr-TR').includes(q));
  if (statuses.length) filtered = filtered.filter((c) => statuses.includes(c.status));
  if (types.length) filtered = filtered.filter((c) => types.includes(c.type));
  if (sources.length) filtered = filtered.filter((c) => sources.includes(c.source));
  if (revenueMin) filtered = filtered.filter((c) => c.totalRevenue >= Number(revenueMin));
  if (revenueMax) filtered = filtered.filter((c) => c.totalRevenue <= Number(revenueMax));

  if (sort) {
    const [field, dir] = sort.split(':');
    const desc = dir === 'desc';
    filtered.sort((a, b) => {
      const av = (a as Record<string, unknown>)[field ?? ''];
      const bv = (b as Record<string, unknown>)[field ?? ''];
      if (typeof av === 'number' && typeof bv === 'number') return desc ? bv - av : av - bv;
      return desc
        ? String(bv ?? '').localeCompare(String(av ?? ''), 'tr-TR')
        : String(av ?? '').localeCompare(String(bv ?? ''), 'tr-TR');
    });
  }

  const total = filtered.length;
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);
  return { items, total, page, pageSize };
}

function applyLeadQuery(url: URL): Paginated<Lead> {
  const page = Number(url.searchParams.get('page') ?? '1');
  const pageSize = Number(url.searchParams.get('pageSize') ?? '25');
  const q = (url.searchParams.get('q') ?? '').toLocaleLowerCase('tr-TR');
  const stages = multiParam(url, 'stage');
  const priorities = multiParam(url, 'priority');
  const contactId = url.searchParams.get('contactId');
  const valueMin = url.searchParams.get('valueMin');
  const valueMax = url.searchParams.get('valueMax');
  const sort = url.searchParams.get('sort');

  let filtered = [...leads];

  if (q) filtered = filtered.filter((l) => l.title.toLocaleLowerCase('tr-TR').includes(q) || l.contactName.toLocaleLowerCase('tr-TR').includes(q));
  if (stages.length) filtered = filtered.filter((l) => stages.includes(l.stage));
  if (priorities.length) filtered = filtered.filter((l) => priorities.includes(l.priority));
  if (contactId) filtered = filtered.filter((l) => l.contactId === contactId);
  if (valueMin) filtered = filtered.filter((l) => l.value >= Number(valueMin));
  if (valueMax) filtered = filtered.filter((l) => l.value <= Number(valueMax));

  if (sort) {
    const [field, dir] = sort.split(':');
    const desc = dir === 'desc';
    filtered.sort((a, b) => {
      const av = (a as Record<string, unknown>)[field ?? ''];
      const bv = (b as Record<string, unknown>)[field ?? ''];
      if (typeof av === 'number' && typeof bv === 'number') return desc ? bv - av : av - bv;
      return desc
        ? String(bv ?? '').localeCompare(String(av ?? ''), 'tr-TR')
        : String(av ?? '').localeCompare(String(bv ?? ''), 'tr-TR');
    });
  }

  const total = filtered.length;
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);
  return { items, total, page, pageSize };
}

// ── Stats ──────────────────────────────────────────────────────────────────

function computeStats() {
  const totalContacts = contacts.length;
  const vipContacts = contacts.filter((c) => c.status === 'vip').length;
  const activeLeads = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost').length;
  const wonLeads = leads.filter((l) => l.stage === 'won').length;
  const totalPipeline = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost').reduce((sum, l) => sum + l.value, 0);
  const wonRevenue = leads.filter((l) => l.stage === 'won').reduce((sum, l) => sum + l.value, 0);
  const overdueFollowUps = contacts.filter((c) => c.nextFollowUpAt && new Date(c.nextFollowUpAt) < new Date()).length;
  const conversionRate = leads.length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0;

  return {
    totalContacts,
    vipContacts,
    activeLeads,
    wonLeads,
    totalPipeline,
    wonRevenue,
    overdueFollowUps,
    conversionRate,
  };
}

// ── Handlers ───────────────────────────────────────────────────────────────

export const crmHandlers = [
  // ── Contacts ──
  http.get(`${API_BASE_URL}/crm/contacts`, ({ request }) => {
    return HttpResponse.json(applyContactQuery(new URL(request.url)));
  }),

  http.get(`${API_BASE_URL}/crm/contacts/:id`, ({ params }) => {
    const contact = contacts.find((c) => c.id === params['id']);
    if (!contact) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(contact);
  }),

  http.post(`${API_BASE_URL}/crm/contacts`, async ({ request }) => {
    const body = (await request.json()) as Partial<Contact>;
    contactSeq += 1;
    const now = new Date().toISOString();
    const contact: Contact = {
      id: `C-${3000 + contactSeq}`,
      userId: undefined,
      fullName: body.fullName ?? '',
      email: body.email ?? '',
      phone: body.phone ?? '',
      company: body.company,
      type: body.type ?? 'individual',
      status: body.status ?? 'active',
      source: body.source ?? 'web',
      assigneeId: body.assigneeId,
      assigneeName: body.assigneeName,
      tags: body.tags ?? [],
      il: body.il ?? '34',
      totalListings: 0,
      activeListings: 0,
      totalRevenue: 0,
      lastContactedAt: null,
      nextFollowUpAt: null,
      notes: body.notes,
      createdAt: now,
      updatedAt: now,
    };
    contacts.unshift(contact);
    writeAudit({ actor: 'admin-1', action: 'crm.create', resource: `contact:${contact.id}`, after: contact });
    return HttpResponse.json(contact, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/crm/contacts/:id`, async ({ params, request }) => {
    const idx = contacts.findIndex((c) => c.id === params['id']);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as Partial<Contact>;
    const before = { ...contacts[idx] };
    const updated: Contact = { ...(contacts[idx] as Contact), ...body, updatedAt: new Date().toISOString() };
    contacts[idx] = updated;
    writeAudit({ actor: 'admin-1', action: 'crm.edit', resource: `contact:${updated.id}`, before, after: updated });
    return HttpResponse.json(updated);
  }),

  http.delete(`${API_BASE_URL}/crm/contacts/:id`, ({ params }) => {
    const idx = contacts.findIndex((c) => c.id === params['id']);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    const removed = contacts.splice(idx, 1)[0];
    writeAudit({ actor: 'admin-1', action: 'crm.delete', resource: `contact:${removed?.id}` });
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Leads ──
  http.get(`${API_BASE_URL}/crm/leads`, ({ request }) => {
    return HttpResponse.json(applyLeadQuery(new URL(request.url)));
  }),

  http.get(`${API_BASE_URL}/crm/leads/:id`, ({ params }) => {
    const lead = leads.find((l) => l.id === params['id']);
    if (!lead) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(lead);
  }),

  http.post(`${API_BASE_URL}/crm/leads`, async ({ request }) => {
    const body = (await request.json()) as Partial<Lead>;
    leadSeq += 1;
    const contact = contacts.find((c) => c.id === body.contactId);
    const now = new Date().toISOString();
    const lead: Lead = {
      id: `L-${4000 + leadSeq}`,
      contactId: body.contactId ?? '',
      contactName: contact?.fullName ?? '',
      title: body.title ?? '',
      stage: body.stage ?? 'new',
      priority: body.priority ?? 'medium',
      value: body.value ?? 0,
      probability: body.probability ?? 10,
      source: body.source ?? 'web',
      assigneeId: body.assigneeId,
      assigneeName: body.assigneeName,
      expectedCloseDate: body.expectedCloseDate ?? null,
      lostReason: body.lostReason,
      createdAt: now,
      updatedAt: now,
    };
    leads.unshift(lead);
    writeAudit({ actor: 'admin-1', action: 'crm.create', resource: `lead:${lead.id}`, after: lead });
    return HttpResponse.json(lead, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/crm/leads/:id`, async ({ params, request }) => {
    const idx = leads.findIndex((l) => l.id === params['id']);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as Partial<Lead>;
    const before = { ...leads[idx] };
    const updated: Lead = { ...(leads[idx] as Lead), ...body, updatedAt: new Date().toISOString() };
    leads[idx] = updated;
    writeAudit({ actor: 'admin-1', action: 'crm.edit', resource: `lead:${updated.id}`, before, after: updated });
    return HttpResponse.json(updated);
  }),

  // ── Activities ──
  http.get(`${API_BASE_URL}/crm/activities`, ({ request }) => {
    const url = new URL(request.url);
    const contactId = url.searchParams.get('contactId');
    let filtered = [...activities];
    if (contactId) filtered = filtered.filter((a) => a.contactId === contactId);
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return HttpResponse.json({ items: filtered, total: filtered.length, page: 1, pageSize: filtered.length });
  }),

  http.post(`${API_BASE_URL}/crm/activities`, async ({ request }) => {
    const body = (await request.json()) as Partial<Activity>;
    activitySeq += 1;
    const now = new Date().toISOString();
    const activity: Activity = {
      id: `A-${5000 + activitySeq}`,
      contactId: body.contactId ?? '',
      type: body.type ?? 'note',
      subject: body.subject ?? '',
      description: body.description,
      scheduledAt: body.scheduledAt ?? null,
      completedAt: null,
      createdBy: 'admin-1',
      createdAt: now,
    };
    activities.unshift(activity);

    // Update contact lastContactedAt
    const contactIdx = contacts.findIndex((c) => c.id === activity.contactId);
    if (contactIdx !== -1) {
      (contacts[contactIdx] as Contact).lastContactedAt = now;
      (contacts[contactIdx] as Contact).updatedAt = now;
    }

    writeAudit({ actor: 'admin-1', action: 'crm.activity', resource: `contact:${activity.contactId}`, after: activity });
    return HttpResponse.json(activity, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/crm/activities/:id/complete`, ({ params }) => {
    const idx = activities.findIndex((a) => a.id === params['id']);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    const now = new Date().toISOString();
    (activities[idx] as Activity).completedAt = now;
    return HttpResponse.json(activities[idx]);
  }),

  // ── Stats ──
  http.get(`${API_BASE_URL}/crm/stats`, () => {
    return HttpResponse.json(computeStats());
  }),

  // ── Contact leads ──
  http.get(`${API_BASE_URL}/crm/contacts/:id/leads`, ({ params }) => {
    const contactLeads = leads.filter((l) => l.contactId === params['id']);
    return HttpResponse.json({ items: contactLeads, total: contactLeads.length, page: 1, pageSize: contactLeads.length });
  }),
];
