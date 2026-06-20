import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { LocalTime } from "@/components/local-time"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AdminSessions } from "@/features/admin/components/admin-sessions"
import { EditUserForm } from "@/features/admin/components/edit-user-form"
import { RoleBadge } from "@/features/admin/components/role-badge"
import { UserAccountActions } from "@/features/admin/components/user-account-actions"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import {
  removeUserAvatarAction,
  setUserAvatarAction,
} from "@/features/admin/server/actions"
import {
  requirePermission,
  userHasPermission,
} from "@/features/admin/server/permissions"
import {
  getUserDetailByPublicId,
  listSessionsForUserPublicId,
} from "@/features/admin/server/users"
import { AvatarUpload } from "@/features/auth/components/avatar-upload"

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 py-2 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  )
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>
}) {
  const acting = await requirePermission(PERMISSIONS.ADMIN_PAGE_USER, "/admin")

  const { publicId } = await params
  const user = await getUserDetailByPublicId(publicId)
  if (!user) notFound()

  const sessions = await listSessionsForUserPublicId(publicId)

  const actingId = Number(acting.id)
  const [canModify, canPassword, canRestrict, canSession, canAvatar] =
    await Promise.all([
      userHasPermission(actingId, acting.role, PERMISSIONS.MODIFY_USER),
      userHasPermission(actingId, acting.role, PERMISSIONS.PASSWORD_USER),
      userHasPermission(actingId, acting.role, PERMISSIONS.RESTRICT_USER),
      userHasPermission(actingId, acting.role, PERMISSIONS.SESSION_USER),
      userHasPermission(actingId, acting.role, PERMISSIONS.AVATAR_USER),
    ])
  const actingIsSuper = acting.role === "SUPER_ADMIN"
  // Non-super admins can't edit a super admin account.
  const canEdit = canModify && (user.role !== "SUPER_ADMIN" || actingIsSuper)

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/users"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Users
      </Link>

      <div className="flex flex-wrap items-start gap-4">
        {canAvatar ? (
          <AvatarUpload
            name={user.name}
            image={user.image}
            onUpload={setUserAvatarAction.bind(null, user.publicId)}
            onRemove={removeUserAvatarAction.bind(null, user.publicId)}
          />
        ) : (
          <Avatar className="size-16">
            <AvatarImage src={user.image ?? undefined} alt="" />
            <AvatarFallback className="text-lg">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex flex-col gap-2 pt-1">
          <PageHeader title={user.name} description={user.email} />
          <div className="flex items-center gap-2">
            <RoleBadge role={user.role} />
            {user.banned ? (
              <Badge variant="destructive">Restricted</Badge>
            ) : null}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Full account record.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border/60">
            <DetailRow label="Public ID">
              <span className="font-mono text-xs break-all">
                {user.publicId}
              </span>
            </DetailRow>
            <DetailRow label="Name">{user.name}</DetailRow>
            <DetailRow label="Email">{user.email}</DetailRow>
            <DetailRow label="Email verified">
              {user.emailVerified ? "Yes" : "No"}
            </DetailRow>
            <DetailRow label="Role">
              <RoleBadge role={user.role} />
            </DetailRow>
            <DetailRow label="Status">
              {user.banned ? "Restricted" : "Active"}
            </DetailRow>
            {user.banned && user.banReason ? (
              <DetailRow label="Restriction reason">
                {user.banReason}
              </DetailRow>
            ) : null}
            {user.banned && user.banExpires ? (
              <DetailRow label="Restriction expires">
                <LocalTime
                  value={user.banExpires}
                  dateStyle="long"
                  timeStyle="short"
                />
              </DetailRow>
            ) : null}
            <DetailRow label="Created">
              <LocalTime
                value={user.createdAt}
                dateStyle="long"
                timeStyle="short"
              />
            </DetailRow>
            <DetailRow label="Updated">
              <LocalTime
                value={user.updatedAt}
                dateStyle="long"
                timeStyle="short"
              />
            </DetailRow>
          </dl>
        </CardContent>
      </Card>

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit user</CardTitle>
            <CardDescription>
              Update this user&apos;s name, email, role, and verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditUserForm
              userPublicId={user.publicId}
              defaultName={user.name}
              defaultEmail={user.email}
              defaultRole={user.role ?? ""}
              defaultEmailVerified={user.emailVerified}
              allowSuperAdmin={actingIsSuper}
            />
          </CardContent>
        </Card>
      ) : null}

      {canPassword || canRestrict ? (
        <Card>
          <CardHeader>
            <CardTitle>Security &amp; access</CardTitle>
            <CardDescription>
              Set a password, send a reset link, or restrict this account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserAccountActions
              userPublicId={user.publicId}
              banned={user.banned}
              banReason={user.banReason}
              canPassword={canPassword}
              canRestrict={canRestrict}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Sessions &amp; devices</CardTitle>
          <CardDescription>
            Active sessions for this user.
            {canSession ? " Force sign-out any you don't recognize." : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminSessions
            userPublicId={user.publicId}
            sessions={sessions}
            canRevoke={canSession}
          />
        </CardContent>
      </Card>
    </div>
  )
}
