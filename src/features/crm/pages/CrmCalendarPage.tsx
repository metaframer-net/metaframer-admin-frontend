import { useCallback, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Calendar as CalendarIcon,
  Mail,
  StickyNote,
  ListTodo,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useContacts } from '../api/queries';
import type { TableQuery } from '@/components/data-table/types';
import type { Activity } from '../schemas/activity';
import { ACTIVITY_TYPE_LABELS } from '../data/crm';
import { api } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import { useQuery } from '@tanstack/react-query';
import { crmKeys } from '../api/queries';

const ACTIVITY_ICONS: Record<Activity['type'], LucideIcon> = {
  call: Phone,
  meeting: CalendarIcon,
  email: Mail,
  note: StickyNote,
  task: ListTodo,
};

const ACTIVITY_COLORS: Record<Activity['type'], string> = {
  call: 'bg-chart-1/10 text-chart-1',
  meeting: 'bg-chart-3/10 text-chart-3',
  email: 'bg-chart-4/10 text-chart-4',
  note: 'bg-muted text-muted-foreground',
  task: 'bg-success/15 text-success-foreground',
};

/** Static query for fetching all contacts — no URL-driven pagination needed in calendar. */
const CALENDAR_CONTACTS_QUERY: TableQuery = { page: 1, pageSize: 200, sort: [], filters: {}, q: '' };

const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday = 0, Sunday = 6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  return { startOffset, totalDays };
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface CalendarEvent {
  id: string;
  type: 'activity' | 'followup';
  title: string;
  subtitle: string;
  activityType?: Activity['type'];
  date: Date;
  completed?: boolean;
}

export function CrmCalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Fetch all activities once (stable key — client-side filtering by month)
  const { data: activitiesData, isLoading: activitiesLoading, isError: activitiesError, refetch: refetchActivities } = useQuery({
    queryKey: [...crmKeys.all, 'calendar-activities'],
    queryFn: () => api.get<Paginated<Activity>>('/crm/activities', new URLSearchParams()),
  });

  // Fetch contacts with follow-ups (static query — no URL-driven pagination needed)
  const { data: contactsData, isLoading: contactsLoading } = useContacts(CALENDAR_CONTACTS_QUERY);

  const events = useMemo(() => {
    const result: CalendarEvent[] = [];

    // Activities with scheduledAt
    for (const a of activitiesData?.items ?? []) {
      if (a.scheduledAt) {
        result.push({
          id: a.id,
          type: 'activity',
          title: a.subject,
          subtitle: ACTIVITY_TYPE_LABELS[a.type],
          activityType: a.type,
          date: new Date(a.scheduledAt),
          completed: Boolean(a.completedAt),
        });
      }
    }

    // Follow-up dates from contacts
    for (const c of contactsData?.items ?? []) {
      if (c.nextFollowUpAt) {
        result.push({
          id: `followup-${c.id}`,
          type: 'followup',
          title: `Takip: ${c.fullName}`,
          subtitle: 'Planlı takip',
          date: new Date(c.nextFollowUpAt),
        });
      }
    }

    return result;
  }, [activitiesData, contactsData]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = dateKey(event.date);
      const existing = map.get(key) ?? [];
      existing.push(event);
      map.set(key, existing);
    }
    return map;
  }, [events]);

  const { startOffset, totalDays } = getMonthDays(year, month);
  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => dateKey(now), [now]);

  const prevMonth = useCallback(() => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    setSelectedDate(null);
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    setSelectedDate(null);
  }, []);

  const goToday = useCallback(() => {
    setCurrentDate(new Date());
    setSelectedDate(today);
  }, [today]);

  const isLoading = activitiesLoading || contactsLoading;

  if (activitiesError) return <ErrorState onRetry={() => void refetchActivities()} />;

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">CRM Takvim</h1>
        <p className="text-muted-foreground text-sm">Aktiviteler ve takip planları takvim görünümü.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Calendar grid */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg tabular-nums">
                {MONTHS_TR[month]} {year}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={prevMonth} aria-label="Önceki ay">
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToday}>
                  Bugün
                </Button>
                <Button variant="ghost" size="sm" onClick={nextMonth} aria-label="Sonraki ay">
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-80 w-full rounded-lg" />
            ) : (
              <div className="grid grid-cols-7" role="table" aria-label="Takvim">
                {/* Day headers */}
                {DAYS_TR.map((d) => (
                  <div key={d} className="text-muted-foreground border-border border-b py-2 text-center text-xs font-medium" role="columnheader" aria-label={d}>
                    {d}
                  </div>
                ))}

                {/* Empty cells for offset */}
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`empty-${i}`} className="border-border border-b border-r p-1" />
                ))}

                {/* Day cells */}
                {Array.from({ length: totalDays }).map((_, i) => {
                  const day = i + 1;
                  const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayEvents = eventsByDate.get(key) ?? [];
                  const isToday = key === today;
                  const isSelected = key === selectedDate;
                  const hasOverdue = dayEvents.some((e) => e.type === 'followup' && e.date < now && !e.completed);

                  return (
                    <button
                      key={key}
                      type="button"
                      className={`border-border min-h-[48px] border-b border-r p-1 text-left transition-colors hover:bg-muted focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none md:min-h-[72px] ${
                        isSelected ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => setSelectedDate(key)}
                      aria-label={`${day} ${MONTHS_TR[month]}, ${dayEvents.length} etkinlik${hasOverdue ? ', gecikmiş takip var' : ''}`}
                      aria-pressed={isSelected}
                    >
                      <span
                        className={`inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums ${
                          isToday ? 'bg-primary text-primary-foreground font-bold' : ''
                        } ${hasOverdue ? 'text-destructive font-bold' : ''}`}
                      >
                        {day}
                        {hasOverdue && <AlertCircle className="ml-0.5 inline size-3" aria-hidden="true" />}
                      </span>

                      {/* Mobile: simple dot indicator */}
                      {dayEvents.length > 0 && (
                        <div className="bg-primary mx-auto mt-0.5 size-1.5 rounded-full md:hidden" />
                      )}
                      {/* Desktop: event chips */}
                      {dayEvents.length > 0 && (
                        <div className="mt-0.5 hidden flex-wrap gap-0.5 md:flex">
                          {dayEvents.slice(0, 3).map((ev) => {
                            const color = ev.activityType
                              ? ACTIVITY_COLORS[ev.activityType]
                              : 'bg-primary/10 text-primary';
                            return (
                              <div
                                key={ev.id}
                                className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight ${color} ${
                                  ev.completed ? 'line-through opacity-60' : ''
                                }`}
                              >
                                {ev.title.slice(0, 12)}
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <span className="text-muted-foreground text-[10px]">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side panel — selected date detail */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedDate
                ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'Tarih Seçin'}
            </CardTitle>
            <CardDescription>
              {selectedEvents.length > 0 ? `${selectedEvents.length} etkinlik` : 'Etkinlik yok'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedEvents.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                {selectedDate ? 'Bu tarihte etkinlik bulunmuyor.' : 'Takvimden bir gün seçin.'}
              </p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((ev) => {
                  const Icon = ev.activityType ? ACTIVITY_ICONS[ev.activityType] : CalendarIcon;
                  return (
                    <div key={ev.id} className="flex gap-3 rounded-lg border p-3">
                      <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                        ev.activityType ? ACTIVITY_COLORS[ev.activityType] : 'bg-primary/10 text-primary'
                      }`}>
                        {ev.completed ? <Check className="size-4" /> : <Icon className="size-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${ev.completed ? 'line-through opacity-60' : ''}`}>
                          {ev.title}
                        </p>
                        <p className="text-muted-foreground text-xs">{ev.subtitle}</p>
                        <time className="text-muted-foreground text-xs tabular-nums">
                          {ev.date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>
                      <div className="flex items-start">
                        <Badge variant={ev.type === 'followup' ? 'secondary' : 'outline'} className="text-[10px]">
                          {ev.type === 'followup' ? 'Takip' : ev.subtitle}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Yaklaşan Etkinlikler</CardTitle>
          <CardDescription>Önümüzdeki 7 gün içindeki aktivite ve takipler.</CardDescription>
        </CardHeader>
        <CardContent>
          <UpcomingList events={events} />
        </CardContent>
      </Card>
    </div>
  );
}

function UpcomingList({ events }: { events: CalendarEvent[] }) {
  const upcoming = useMemo(() => {
    const now = new Date();
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    return events
      .filter((e) => e.date >= now && e.date <= weekLater && !e.completed)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10);
  }, [events]);

  if (upcoming.length === 0) {
    return <p className="text-muted-foreground py-4 text-center text-sm">Yaklaşan etkinlik yok.</p>;
  }

  return (
    <div className="divide-border divide-y">
      {upcoming.map((ev) => {
        const Icon = ev.activityType ? ACTIVITY_ICONS[ev.activityType] : CalendarIcon;
        return (
          <div key={ev.id} className="flex items-center gap-3 py-2.5">
            <div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
              ev.activityType ? ACTIVITY_COLORS[ev.activityType] : 'bg-primary/10 text-primary'
            }`}>
              <Icon className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{ev.title}</p>
              <p className="text-muted-foreground text-xs">{ev.subtitle}</p>
            </div>
            <time className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {ev.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            </time>
          </div>
        );
      })}
    </div>
  );
}
