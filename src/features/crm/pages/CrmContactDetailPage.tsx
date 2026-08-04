import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Building2, Tag, Calendar } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Can } from '@/lib/permissions/permission-context';
import { getAuditFor } from '@/lib/audit';
import { AuditTimeline } from '@/features/audit';
import { LOCATIONS } from '@/features/listings/data/taxonomy';
import { useContact, useContactLeads, useContactActivities } from '../api/queries';
import { useUpdateContact, useCreateLead, useCreateActivity, useCompleteActivity } from '../api/mutations';
import { ContactStatusBadge } from '../components/ContactStatusBadge';
import { LeadStageBadge } from '../components/LeadStageBadge';
import { LeadPriorityBadge } from '../components/LeadPriorityBadge';
import { PortfolioSummary } from '../components/PortfolioSummary';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { ContactFormDialog } from '../components/ContactFormDialog';
import { LeadFormDialog } from '../components/LeadFormDialog';
import { ActivityFormDialog } from '../components/ActivityFormDialog';
import { formToPayload } from '../schemas/contact';
import { leadFormToPayload } from '../schemas/lead';
import { CONTACT_TYPE_LABELS, CONTACT_SOURCE_LABELS } from '../data/crm';
import type { ContactFormValues, Contact } from '../schemas/contact';
import type { LeadFormValues, Lead } from '../schemas/lead';
import type { ActivityFormValues } from '../schemas/activity';

export function CrmContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: contact, isLoading, isError, refetch } = useContact(id);
  const { data: leadsData } = useContactLeads(id ?? '');
  const { data: activitiesData } = useContactActivities(id ?? '');
  const updateContact = useUpdateContact(id ?? '');
  const createLead = useCreateLead();
  const createActivity = useCreateActivity(id ?? '');
  const completeActivity = useCompleteActivity(id ?? '');

  if (isLoading) return <LoadingState label="Kişi yükleniyor…" />;
  if (isError || !contact) return <ErrorState title="Kişi bulunamadı" onRetry={() => void refetch()} />;

  const audit = getAuditFor(`contact:${contact.id}`);
  const contactLeads = leadsData?.items ?? [];
  const contactActivities = activitiesData?.items ?? [];

  async function handleUpdate(values: ContactFormValues) {
    const payload = formToPayload(values);
    await updateContact.mutateAsync(payload as Partial<Contact>);
  }

  async function handleCreateLead(values: LeadFormValues) {
    const payload = leadFormToPayload(values);
    await createLead.mutateAsync(payload as Partial<Lead>);
  }

  async function handleCreateActivity(values: ActivityFormValues) {
    await createActivity.mutateAsync({
      type: values.type,
      subject: values.subject,
      description: values.description,
      scheduledAt: values.scheduledAt ?? null,
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Back nav */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/crm" data-action="navigate" data-entity="contact">
            <ArrowLeft className="size-4" /> Kişiler
          </Link>
        </Button>
      </div>

      {/* ── Header card ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-xl">{contact.fullName}</CardTitle>
              <CardDescription>
                {CONTACT_TYPE_LABELS[contact.type]}
                {contact.company && ` · ${contact.company}`}
                {' · '}Kaynak: {CONTACT_SOURCE_LABELS[contact.source]}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <ContactStatusBadge status={contact.status} />
              <Can permission="crm.edit">
                <ContactFormDialog contact={contact} onSubmit={handleUpdate} />
              </Can>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
            <Field label="E-posta" value={contact.email} icon={<Mail className="size-3.5" />} />
            <Field label="Telefon" value={contact.phone} icon={<Phone className="size-3.5" />} />
            <Field label="Şehir" value={LOCATIONS[contact.il]?.label} />
            <Field label="Kayıt Tarihi" value={new Date(contact.createdAt).toLocaleDateString('tr-TR')} icon={<Calendar className="size-3.5" />} />
            {contact.assigneeName && <Field label="Sorumlu" value={contact.assigneeName} />}
            {contact.nextFollowUpAt && (
              <Field
                label="Sonraki Takip"
                value={new Date(contact.nextFollowUpAt).toLocaleDateString('tr-TR')}
                highlight={new Date(contact.nextFollowUpAt) < new Date()}
              />
            )}
          </dl>

          {contact.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag className="text-muted-foreground size-3.5" />
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}

          {contact.notes && (
            <>
              <Separator />
              <div>
                <span className="text-muted-foreground text-xs">Notlar</span>
                <p className="mt-0.5 text-sm">{contact.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Portfolio summary ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="text-muted-foreground size-4" />
            <CardTitle className="text-base">Portföy Özeti</CardTitle>
          </div>
          <CardDescription>Kişinin ilan ve gelir metrikleri.</CardDescription>
        </CardHeader>
        <CardContent>
          <PortfolioSummary contact={contact} />
        </CardContent>
      </Card>

      {/* ── Leads ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Leadler ({contactLeads.length})</CardTitle>
              <CardDescription>Bu kişiye bağlı satış fırsatları.</CardDescription>
            </div>
            <Can permission="crm.edit">
              <LeadFormDialog contactId={contact.id} onSubmit={handleCreateLead} />
            </Can>
          </div>
        </CardHeader>
        <CardContent>
          {contactLeads.length === 0 ? (
            <EmptyState
              title="Henüz lead bulunmuyor"
              description="Bu kişi için ilk satış fırsatını oluşturun."
              action={
                <Can permission="crm.edit">
                  <LeadFormDialog contactId={contact.id} onSubmit={handleCreateLead} />
                </Can>
              }
            />
          ) : (
            <div className="space-y-2">
              {contactLeads.map((lead) => (
                <div key={lead.id} className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{lead.title}</p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      ₺{lead.value.toLocaleString('tr-TR')} · {lead.probability}%
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <LeadPriorityBadge priority={lead.priority} />
                    <LeadStageBadge stage={lead.stage} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Activities ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Aktiviteler ({contactActivities.length})</CardTitle>
              <CardDescription>Arama, toplantı, e-posta ve notlar.</CardDescription>
            </div>
            <Can permission="crm.edit">
              <ActivityFormDialog onSubmit={handleCreateActivity} />
            </Can>
          </div>
        </CardHeader>
        <CardContent>
          <ActivityTimeline
            activities={contactActivities}
            onComplete={(activityId) => completeActivity.mutate(activityId)}
          />
        </CardContent>
      </Card>

      {/* ── Audit ── */}
      {audit.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Denetim Kaydı</CardTitle>
            <CardDescription>Bu kişi üzerindeki tüm işlemler.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuditTimeline entries={audit} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value?: string | undefined;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-muted-foreground flex items-center gap-1 text-xs">
        {icon}
        {label}
      </dt>
      <dd className={highlight ? 'text-destructive font-medium tabular-nums' : 'tabular-nums'}>
        {value ?? '—'}
      </dd>
    </div>
  );
}
