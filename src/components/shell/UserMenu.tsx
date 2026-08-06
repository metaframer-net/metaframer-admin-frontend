import { Link } from 'react-router-dom';
import { LogOut, ShieldCheck, UserCog } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSession } from '@/lib/permissions/permission-context';
import { useLogout } from '@/features/auth/api/hooks';
import { ROLE_LABELS, ROLES, type Role } from '@/lib/permissions/permissions';

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Current-user menu. In dev it also exposes a role switcher to preview RBAC gating. */
export function UserMenu({ className }: { className?: string }) {
  const { user, setRole } = useSession();
  const logout = useLogout();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('rounded-full', className)}
          aria-label="Kullanıcı menüsü"
          data-action="open-user-menu"
          data-entity="user"
        >
          <Avatar className="size-8">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" collisionPadding={8} className="w-56 max-w-[calc(100vw-1rem)]">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <span className="text-muted-foreground mt-0.5 text-xs">{ROLE_LABELS[user.role]}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Role preview is a DEV-only affordance for exercising RBAC gating; it
            never ships to production, where a user's role is fixed by the server. */}
        {import.meta.env.DEV && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2">
              <UserCog className="size-3.5" /> Rol (önizleme)
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={user.role} onValueChange={(v) => setRole(v as Role)}>
              {ROLES.map((role) => (
                <DropdownMenuRadioItem
                  key={role}
                  value={role}
                  data-action="set-role"
                  data-entity="user"
                >
                  {ROLE_LABELS[role]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild data-action="navigate" data-entity="account">
            <Link to="/account/security">
              <ShieldCheck className="size-4" /> Hesap ve güvenlik
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => logout.mutate()}
            data-action="sign-out"
            data-entity="user"
          >
            <LogOut className="size-4" /> Çıkış yap
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
