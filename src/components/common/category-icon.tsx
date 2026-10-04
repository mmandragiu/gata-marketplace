import { Briefcase, Code, Hammer, PawPrint, Sofa, Sparkles, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  hammer: Hammer,
  code: Code,
  sparkles: Sparkles,
  sofa: Sofa,
  "paw-print": PawPrint,
  briefcase: Briefcase,
};

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] ?? Briefcase;
  return <Icon className={className} aria-hidden />;
}
