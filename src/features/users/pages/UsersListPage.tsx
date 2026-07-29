import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { DataTable } from '@/components/data-table/DataTable';
import { MobileListCard } from '@/components/data-table/MobileListCard';
import { FilterBar } from '@/components/data-table/FilterBar';
import { useTableUrlState } from '@/components/data-table/use-table-url-state';
import { exportCsv, exportXls } from '@/lib/export';
import { api, encodeListQuery } from '@/lib/api/client';
import type { Paginated } from '@/lib/api/types';
import { Can } from '@/lib/permissions/permission-context';
import { LOCATIONS } from '@/features/listings/data/taxonomy';
import { USER_STATUS_LABELS, USER_TYPE_LABELS } from '../data/users';
import { userFilters } from '../data/filters';
import { userColumns } from '../components/userColumns';
import { UserStatusBadge } from '../components/UserStatusBadge';
import { TrustScoreMeter } from '../components/TrustScoreMeter';
import { VerificationBadges } from '../components/VerificationBadges';
import { UserActionDialog } from '../components/UserActionDialog';
import { useUsers, userKeys } from '../api/queries';
import type { User, UserActionInput } from '../schemas/user';

/** Parse simple Turkish free text into proposed user filters. */
function parseNaturalLanguage(text: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  const lower = text.toLocaleLowerCase('tr');
  if (lower.includes('yasaklı') || lower.includes('yasakli')) out.status = 'banned';
  if (lower.includes('askı') || lower.includes('aski')) out.status = 'suspended';
  if (lower.includes('bekleyen') || lower.includes('onay')) out.status = 'pending';
  if (lower.includes('ofis')) out.type = 'office';
  if (lower.includes('danışman') || lower.includes('danisman') || lower.includes('ajans')) out.type = 'agent';
  if (lower.includes('bireysel')) out.type = 'individual';
  if (lower.includes('doğrulanmış') || lower.includes('dogrulanmis')) out.verification = 'verified';
  const ilEntry = Object.entries(LOCATIONS).find(([, v]) => lower.includes(v.label.toLocaleLowerCase('tr')));
  if (ilEntry) out.il = ilEntry[0];
  return out;
}

export function UsersListPage() {
  const state = useTableUrlState({ defaultPageSize: 25 });
  const { data, isLoading, isError, refetch } = useUsers(state.query);

  return (
    <div className="space-y-4">
      <header className="animate-fade-in flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Kullanıcılar &amp; Ofisler</h1>
          <p className="text-muted-foreground text-sm">Bireysel kullanıcılar, danışmanlar ve emlak ofisleri; doğrulama, askı ve güven skoru.</p>
        </div>
      </header>

      <DataTable
        columns={userColumns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        state={state}
        getRowId={(r) => r.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        filterBar={
          <FilterBar
            tableKey="users"
            filters={userFilters}
            state={state}
            searchPlaceholder="Ad veya e-posta ara…"
            onNaturalLanguage={parseNaturalLanguage}
          />
        }
        renderSubRow={(row) => (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-4">
            <Detail label="Kullanıcı No" value={row.id} />
            <Detail label="E-posta" value={row.email} />
            <Detail label="Telefon" value={row.phone} />
            <Detail label="Ofis" value={row.office?.title ?? row.officeName ?? '—'} />
          </div>
        )}
        renderMobileCard={(row, selected, toggle) => (
          <MobileListCard
            title={row.name}
            to={`/users/${row.id}`}
            entity="user"
            selected={selected}
            onToggleSelect={toggle}
            selectLabel={`${row.name} satırını seç`}
            badges={<UserStatusBadge status={row.status} />}
            meta={[
              { label: 'Tip', value: USER_TYPE_LABELS[row.type] },
              { label: 'Şehir', value: LOCATIONS[row.il]?.label ?? row.il },
              { label: 'Güven', value: <TrustScoreMeter score={row.trustScore} compact />, full: true },
              {
                label: 'Doğrulama',
                value: <VerificationBadges verification={row.verification} hideNone />,
                full: true,
              },
            ]}
          />
        )}
        bulkActions={(ids, _all, clear) => <BulkUserActions ids={ids} clear={clear} />}
        onExport={async (format, scope, ctx) => {
          try {
            let users: User[];
            if (scope === 'selection') {
              const ids = new Set(ctx.selectedIds);
              users = ctx.pageRows.filter((r) => ids.has(r.id));
            } else if (scope === 'all') {
              const params = encodeListQuery({
                page: 1,
                pageSize: Math.max(data?.total ?? 1000, 1),
                sort: state.query.sort,
                filters: state.query.filters,
              });
              if (state.query.q) params.set('q', state.query.q);
              const res = await api.get<Paginated<User>>('/users', params);
              users = res.items;
            } else {
              users = ctx.pageRows;
            }
            const headers = ['Kullanıcı No', 'Ad/Unvan', 'Tip', 'Durum', 'Güven', 'İlan', 'E-posta'];
            const rows = users.map((r) => [
              r.id,
              r.name,
              USER_TYPE_LABELS[r.type],
              USER_STATUS_LABELS[r.status],
              String(r.trustScore),
              String(r.listingsCount),
              r.email,
            ]);
            const exporter = format === 'xls' ? exportXls : exportCsv;
            exporter('kullanicilar', headers, rows);
            toast.success(`${rows.length} kayıt ${format.toUpperCase()} olarak dışa aktarıldı.`);
          } catch {
            toast.error('Dışa aktarma başarısız.');
          }
        }}
      />
    </div>
  );
}

function BulkUserActions({ ids, clear }: { ids: string[]; clear: () => void }) {
  const qc = useQueryClient();

  const run = async (input: UserActionInput) => {
    try {
      await Promise.all(ids.map((id) => api.post(`/users/${id}/action`, input)));
      toast.success(`${ids.length} kullanıcı için işlem uygulandı.`);
      void qc.invalidateQueries({ queryKey: userKeys.all });
      clear();
    } catch {
      toast.error('Toplu işlem başarısız.');
    }
  };

  return (
    <Can permission="user.suspend">
      <div className="flex items-center gap-2">
        <UserActionDialog action="suspend" onConfirm={run} triggerLabel={`${ids.length} kullanıcıyı askıya al`} />
        <Can permission="user.ban">
          <UserActionDialog action="ban" onConfirm={run} triggerLabel={`${ids.length} kullanıcıyı yasakla`} />
        </Can>
      </div>
    </Can>
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
