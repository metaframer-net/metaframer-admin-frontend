import { toast } from 'sonner';

import { DataTable } from '@/components/data-table/DataTable';
import { MobileListCard } from '@/components/data-table/MobileListCard';
import { FilterBar } from '@/components/data-table/FilterBar';
import { useTableUrlState } from '@/components/data-table/use-table-url-state';
import type { TableQuery } from '@/components/data-table/types';
import { exportCsv, exportXls } from '@/lib/export';
import { api, encodeListQuery } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import { LOCATIONS } from '@/features/listings/data/taxonomy';
import { USER_STATUS_LABELS } from '../data/users';
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

export function OfficesListPage() {
  const state = useTableUrlState({ defaultPageSize: 25 });
  const officeQuery = withOfficeType(state.query);
  const { data, isLoading, isError, refetch } = useUsers(officeQuery);

  return (
    <div className="space-y-4">
      <header className="animate-fade-in">
        <h1 className="text-2xl font-semibold">Emlak Ofisleri</h1>
        <p className="text-muted-foreground text-sm">Kayıtlı emlak ofisleri; belge doğrulaması, askı ve güven skoru.</p>
      </header>

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
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-4">
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
