import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Ban, Flag, Gavel, ShieldCheck, Users } from "lucide-react";

import { ReportActions, ResetDemoButton, SettingsForm, UserModerationActions } from "@/components/admin/admin-controls";
import { BannedBadge } from "@/components/common/badges";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCtx } from "@/lib/auth/session";
import { dataMode } from "@/lib/config";
import { timeAgo } from "@/lib/format";
import { getModerationSettings, listModerationUsers, listReports } from "@/lib/services/admin";
import { REPORT_REASON_LABELS } from "@/lib/services/reports";

export const metadata: Metadata = { title: "Moderare" };

const TARGET_LABEL = { profile: "profil", job: "job", bid: "ofertă" } as const;

export default async function AdminPage() {
  const ctx = await getCtx();
  if (!ctx.viewer) redirect("/login?next=/admin");
  if (!ctx.viewer.profile.isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <ShieldCheck className="mx-auto size-10 text-muted-foreground" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">Acces doar pentru moderatori</h1>
        <p className="mt-2 text-muted-foreground">Intră cu contul „Admin Demo” din pagina de autentificare.</p>
      </div>
    );
  }

  const [reports, users, settings] = await Promise.all([listReports(ctx), listModerationUsers(ctx), getModerationSettings(ctx)]);
  const open = reports.filter((r) => r.status === "open");
  const banned = users.filter((u) => u.isBanned);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Gavel className="size-7" aria-hidden /> Moderare
          </h1>
          <p className="text-muted-foreground">Raportări, conturi suspendate și regulile de suspendare automată.</p>
        </div>
        {dataMode() === "demo" && <ResetDemoButton />}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { icon: Flag, label: "Raportări deschise", value: open.length },
          { icon: Ban, label: "Conturi suspendate", value: banned.length },
          { icon: Users, label: "Utilizatori", value: users.length },
          { icon: ShieldCheck, label: "Prag auto-ban", value: settings.autoBanEnabled ? settings.autoBanThreshold : "oprit" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <s.icon className="size-3.5" aria-hidden /> {s.label}
            </p>
            <p className="font-heading text-2xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Utilizatori</CardTitle>
            <CardDescription>Ordonați după suspendare și numărul de raportări.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizator</TableHead>
                  <TableHead className="text-center">Raportări</TableHead>
                  <TableHead>Stare</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className={u.isBanned ? "bg-destructive/5" : undefined}>
                    <TableCell>
                      <Link href={`/workers/${u.id}`} className="flex items-center gap-2 hover:underline">
                        <UserAvatar name={u.fullName} size="sm" ring={u.isBanned ? "banned" : undefined} />
                        <span>
                          <span className="block font-medium">{u.fullName}</span>
                          <span className="block text-xs text-muted-foreground">
                            {u.isWorker ? "lucrător" : "client"}
                            {u.isPremium ? " · Premium" : ""}
                            {u.isVerified ? " · verificat" : ""}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={
                          u.reportCount >= settings.autoBanThreshold
                            ? "font-bold text-destructive"
                            : u.reportCount > 0
                              ? "font-semibold text-casual"
                              : "text-muted-foreground"
                        }
                      >
                        {u.reportCount}/{settings.autoBanThreshold}
                      </span>
                    </TableCell>
                    <TableCell>
                      {u.isBanned ? (
                        <div className="space-y-1">
                          <BannedBadge />
                          {u.bannedReason && <p className="max-w-56 text-xs text-muted-foreground">{u.bannedReason}</p>}
                        </div>
                      ) : (
                        <Badge variant="outline">activ</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <UserModerationActions profileId={u.id} isBanned={u.isBanned} isVerified={u.isVerified} isAdmin={u.isAdmin} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Reguli de suspendare</CardTitle>
            <CardDescription>Aplicate de triggerul din PostgreSQL la fiecare raportare nouă.</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm threshold={settings.autoBanThreshold} enabled={settings.autoBanEnabled} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Raportări</CardTitle>
          <CardDescription>{open.length} deschise din {reports.length}.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Raportat</TableHead>
                <TableHead>Motiv</TableHead>
                <TableHead>De către</TableHead>
                <TableHead>Când</TableHead>
                <TableHead>Stare</TableHead>
                <TableHead className="text-right">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <span className="block font-medium">{r.targetProfile.fullName}</span>
                    <span className="block text-xs text-muted-foreground">
                      {TARGET_LABEL[r.targetType]} · {r.targetProfile.reportCount}/{settings.autoBanThreshold}
                      {r.targetProfile.isBanned ? " · suspendat" : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block">{REPORT_REASON_LABELS[r.reason]}</span>
                    {r.details && <span className="block max-w-72 text-xs text-muted-foreground">{r.details}</span>}
                  </TableCell>
                  <TableCell>{r.reporter.fullName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "open" ? "secondary" : "outline"}>
                      {r.status === "open" ? "deschis" : r.status === "dismissed" ? "respins" : "rezolvat"}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.status === "open" && <ReportActions reportId={r.id} />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
