"use client";

import Link from "next/link";
import { Crown, LayoutDashboard, LogOut, Shield, UserRound, UserRoundPen } from "lucide-react";

import { logout } from "@/app/actions";
import { UserAvatar } from "@/components/common/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  name,
  profileId,
  isPremium,
  isAdmin,
  isBanned,
}: {
  name: string;
  profileId: string;
  isPremium: boolean;
  isAdmin: boolean;
  isBanned: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Meniul contului">
          <UserAvatar name={name} size="sm" ring={isBanned ? "banned" : isPremium ? "premium" : undefined} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard"><LayoutDashboard aria-hidden /> Dashboard</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile"><UserRoundPen aria-hidden /> Editează profilul</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/workers/${profileId}`}><UserRound aria-hidden /> Profilul public</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/premium"><Crown aria-hidden /> {isPremium ? "Abonamentul meu" : "Treci la Premium"}</Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin"><Shield aria-hidden /> Moderare</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <form action={logout}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full"><LogOut aria-hidden /> Ieși din cont</button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
