import { Building2, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth/auth-context';
import { useOrganizations, useSetActiveOrg } from '../api/hooks';

/**
 * Active-organization (tenant) switcher for the shell. Renders nothing unless
 * the signed-in admin belongs to more than one organization.
 */
export function OrgSwitcher() {
  const { status } = useAuth();
  const orgs = useOrganizations(status === 'authenticated');
  const setActive = useSetActiveOrg();

  const data = orgs.data;
  if (!data || data.organizations.length <= 1) return null;
  const active = data.organizations.find((o) => o.id === data.activeOrgId) ?? data.organizations[0]!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="max-w-[12rem] gap-2"
          aria-label={`Organizasyon: ${active.name}. Değiştirmek için aç.`}
          data-action="open-org-switcher"
          data-entity="organization"
        >
          <Building2 className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{active.name}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Organizasyon</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={data.activeOrgId}
          onValueChange={(id) => setActive.mutate(id)}
        >
          {data.organizations.map((o) => (
            <DropdownMenuRadioItem
              key={o.id}
              value={o.id}
              data-action="switch-org"
              data-entity="organization"
            >
              {o.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
