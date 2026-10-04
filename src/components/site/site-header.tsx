import Link from "next/link";
import { Crown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/session";

import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NavLinks, type NavItem } from "./nav-links";
import { RoleToggle } from "./role-toggle";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export async function SiteHeader() {
  const viewer = await getViewer();
  const items: NavItem[] = [
    { href: "/jobs", label: "Joburi" },
    { href: "/workers", label: "Lucrători" },
    ...(viewer ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    ...(viewer?.profile.isAdmin ? [{ href: "/admin", label: "Moderare" }] : []),
    { href: "/docs", label: "API" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <MobileNav items={items} roleMode={viewer?.profile.roleMode} />
        <Logo />
        <NavLinks items={items} className="ml-4 hidden md:flex" />
        <div className="ml-auto flex items-center gap-2">
          {viewer && (
            <div className="hidden lg:block">
              <RoleToggle current={viewer.profile.roleMode} />
            </div>
          )}
          {viewer && !viewer.profile.isPremium && (
            <Button asChild variant="outline" size="sm" className="hidden border-premium/40 sm:inline-flex">
              <Link href="/premium">
                <Crown className="text-premium" aria-hidden /> Premium
              </Link>
            </Button>
          )}
          {viewer && (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/jobs/new">
                <Plus aria-hidden /> Postează job
              </Link>
            </Button>
          )}
          <ThemeToggle />
          {viewer ? (
            <UserMenu
              name={viewer.profile.fullName}
              profileId={viewer.profile.id}
              isPremium={viewer.profile.isPremium}
              isAdmin={viewer.profile.isAdmin}
              isBanned={viewer.profile.isBanned}
            />
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Intră în cont</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
