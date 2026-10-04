"use client";

import { Briefcase, Hammer } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { switchRole } from "@/app/actions";
import { ContinuousTabs } from "@/components/third-party/continuous-tabs";
import type { RoleMode } from "@/lib/services/types";

/** Navbar toggle: the same account works as client (Beneficiar) or worker (Prestator). */
export function RoleToggle({ current, layoutId = "role-toggle" }: { current: RoleMode; layoutId?: string }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(current);

  return (
    <ContinuousTabs
      layoutId={layoutId}
      size="sm"
      ariaLabel="Mod cont"
      disabled={pending}
      value={optimistic}
      onValueChange={(id) =>
        startTransition(async () => {
          setOptimistic(id as RoleMode);
          const res = await switchRole(id as RoleMode);
          if (!res.ok) toast.error(res.message);
          else toast.success(id === "worker" ? "Mod Lucrător activ" : "Mod Client activ");
        })
      }
      tabs={[
        { id: "client", label: <><Briefcase className="size-3.5" aria-hidden />Client</> },
        { id: "worker", label: <><Hammer className="size-3.5" aria-hidden />Lucrător</> },
      ]}
    />
  );
}
