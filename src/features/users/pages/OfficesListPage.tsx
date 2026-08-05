import { toast } from 'sonner';

import { DataTable } from '@/components/data-table/DataTable';
import { MobileListCard } from '@/components/data-table/MobileListCard';
import { FilterBar } from '@/components/data-table/FilterBar';
import { ViewSwitch, parseDataView, type DataView } from '@/components/data-table/ViewSwitch';
import { DataKanban, type KanbanColumn } from '@/components/data-table/DataKanban';
import { DataGallery } from '@/components/data-table/DataGallery';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTablePagination } from '@/components/data-table/DataTablePagination';
import { useTableUrlState } from '@/components/data-table/use-table-url-state';
import type { TableQuery } from '@/components/data-table/types';
import { exportCsv, exportXls } from '@/lib/export';
import { api, encodeListQuery } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import { LOCATIONS } from '@/features/listings/data/taxonomy';
import { USER_STATUS_LABELS, USER_STATUSES } from '../data/users';
import { officeFilters } from '../data/filters';
import { officeColumns } from '../components/officeColumns';
import { UserStatusBadge } from '../components/UserStatusBadge';
import { TrustScoreMeter } from '../components/TrustScoreMeter';
import { VerificationBadges } from '../components/VerificationBadges';
import { useUsers } from '../api/queries';
import type { User } from '../schemas/user';

/** Lock the query to offices regardless of URL state. */
function withOfficeType(query: TableQuery): TableQuery {
  return { ...query, filters: { ...query.filters, type: 'office' } };
}

const STATUS_DOT: Record<User['status'], string> = {
  active: 'bg-success',
  pending: 'bg-warning',
  suspended: 'bg-chart-4',
  banned: 'bg-destructive',
};

const KANBAN_COLUMNS: KanbanColumn<User['status']>[] = USER_STATUSES.map((s) => ({
  key: s,
  label: USER_STATUS_LABELS[s],
  dot: STATUS_DOT[s],
}));

const OFFICE_VIEWS = ['table', 'kanban', 'gallery'] as const satisfies readonly DataView[];

export function OfficesListPage() {
  const state = useTableUrlState({ defaultPageSize: 25 });
  const officeQuery = withOfficeType(state.query);
  const { data, isLoading, isError, refetch } = useUsers(officeQuery);
  const view = parseDataView(state.view, OFFICE_VIEWS);

  return (
    <div className="space-y-4">
      <header className="animate-fade-in flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Emlak Ofisleri</h1>
          <p className="text-muted-foreground text-sm">Kayıtlı emlak ofisleri; belge doğrulaması, askı ve güven skoru.</p>
        </div>
        <ViewSwitch value={view} onChange={(v) => state.setView(v === 'table' ? null : v)} views={OFFICE_VIEWS} entity="office" />
      </header>

      {view === 'table' ? (
        <DataTable
          columns={officeColumns}
          data={data?.items ?? []}
          total={data?.total ?? 0}
          state={state}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          filterBar={
            <FilterBar tableKey="offices" filters={officeFilters} state={state} searchPlaceholder="Ofis unvanı ara…" />
          }
          renderSubRow={(row) => (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm xl:grid-cols-4">
            <Detail label="Kullanıcı No" value={row.id} />
            <Detail label="E-posta" value={row.email} />
            <Detail label="Telefon" value={row.phone} />
            <Detail
              label="Konum"
              value={
                row.office
                  ? `${LOCATIONS[row.office.il]?.districts[row.office.ilce]?.label ?? row.office.ilce}, ${LOCATIONS[row.office.il]?.label ?? row.office.il}`
                  : '—'
              }
            />
            <Detail label="Üye Danışmanlar" value={row.office?.memberAgents.join(', ') ?? '—'} />
          </div>
        )}
        renderMobileCard={(row, selected, toggle) => (
          <MobileListCard
            title={row.name}
            to={`/users/${row.id}`}
            entity="agent"
            selected={selected}
            onToggleSelect={toggle}
            selectLabel={`${row.name} satırını seç`}
            badges={<UserStatusBadge status={row.status} />}
            meta={[
              { label: 'Vergi No', value: <span className="tabular-nums">{row.office?.taxId ?? '—'}</span> },
              { label: 'Şehir', value: LOCATIONS[row.il]?.label ?? row.il },
              { label: 'Üye Danışman', value: <span className="tabular-nums">{row.office?.memberAgents.length ?? 0}</span> },
              { label: 'Güven', value: <TrustScoreMeter score={row.trustScore} compact />, full: true },
              {
                label: 'Doğrulama',
                value: <VerificationBadges verification={row.verification} hideNone />,
                full: true,
              },
            ]}
          />
        )}
        onExport={async (format, scope, ctx) => {
          try {
            let offices: User[];
            if (scope === 'selection') {
              const ids = new Set(ctx.selectedIds);
              offices = ctx.pageRows.filter((r) => ids.has(r.id));
            } else if (scope === 'all') {
              const params = encodeListQuery({
                page: 1,
                pageSize: Math.max(data?.total ?? 1000, 1),
                sort: officeQuery.sort,
                filters: officeQuery.filters,
              });
              if (officeQuery.q) params.set('q', officeQuery.q);
              const res = await api.get<Paginated<User>>('/users', params);
              offices = res.items;
            } else {
              offices = ctx.pageRows;
            }
            const headers = ['Kullanıcı No', 'Unvan', 'Vergi No', 'Durum', 'Güven', 'Üye Danışman', 'Şehir'];
            const rows = offices.map((r) => [
              r.id,
              r.name,
              r.office?.taxId ?? '',
              USER_STATUS_LABELS[r.status],
              String(r.trustScore),
              String(r.office?.memberAgents.length ?? 0),
              LOCATIONS[r.il]?.label ?? r.il,
            ]);
            const exporter = format === 'xls' ? exportXls : exportCsv;
            exporter('emlak-ofisleri', headers, rows);
            toast.success(`${rows.length} kayıt ${format.toUpperCase()} olarak dışa aktarıldı.`);
          } catch {
            toast.error('Dışa aktarma başarısız.');
          }
        }}
      />
      ) : (
        <div className="space-y-3">
          <FilterBar tableKey="offices" filters={officeFilters} state={state} searchPlaceholder="Ofis unvanı ara…" />
          {isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Ofisler yükleniyor">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : view === 'kanban' ? (
            <DataKanban
              data={data?.items ?? []}
              columns={KANBAN_COLUMNS}
              getStatus={(u) => u.status}
              getKey={(u) => u.id}
              entity="office"
              renderCard={(u) => (
                <div className="bg-card hover:border-primary/40 rounded-lg border border-border p-3 shadow-xs transition-colors">
                  <p className="text-sm font-semibold">{u.name}</p>
                  <p className="text-muted-foreground mt-1 text-xs tabular-nums">{u.office?.taxId ?? '—'}</p>
                  <div className="text-muted-foreground mt-1 truncate text-xs">{u.email}</div>
                  <div className="mt-2 border-t border-dashed border-border pt-2">
                    <TrustScoreMeter score={u.trustScore} compact />
                  </div>
                </div>
              )}
            />
          ) : (
            <DataGallery
              data={data?.items ?? []}
              getKey={(u) => u.id}
              renderCard={(u) => (
                <div className="bg-card overflow-hidden rounded-xl border border-border shadow-xs transition-shadow hover:shadow-md">
                  <div className="from-primary/20 to-accent/20 flex aspect-[16/7] items-center justify-center bg-gradient-to-br">
                    <span className="text-foreground/50 text-3xl font-bold">{u.name.split(' ').map((n) => n[0]).join('')}</span>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="truncate text-sm font-semibold">{u.name}</h3>
                      <UserStatusBadge status={u.status} />
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs tabular-nums">{u.office?.taxId ?? '—'}</p>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">{LOCATIONS[u.il]?.label ?? u.il}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <TrustScoreMeter score={u.trustScore} compact />
                      <span className="tabular-nums">{u.office?.memberAgents.length ?? 0} danışman</span>
                    </div>
                  </div>
                </div>
              )}
            />
          )}
          <DataTablePagination
            page={state.pagination.pageIndex + 1}
            pageSize={state.pagination.pageSize}
            total={data?.total ?? 0}
            selectedCount={0}
            onPageChange={state.setPage}
            onPageSizeChange={state.setPageSize}
          />
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="break-all">{value}</dd>
    </div>
  );
}
