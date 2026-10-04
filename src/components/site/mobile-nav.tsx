"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { RoleMode } from "@/lib/services/types";

import { NavLinks, type NavItem } from "./nav-links";
import { RoleToggle } from "./role-toggle";

export function MobileNav({ items, roleMode }: { items: NavItem[]; roleMode?: RoleMode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Deschide meniul">
          <Menu aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>Meniu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          {roleMode && <RoleToggle current={roleMode} layoutId="role-toggle-mobile" />}
          <NavLinks items={items} className="flex-col items-stretch" onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
