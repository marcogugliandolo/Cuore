import { HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function BrandLogo({ className, size = "md" }: BrandLogoProps) {
  const dimensions = {
    sm: { icon: 20, text: "text-xl", gap: "gap-2" },
    md: { icon: 24, text: "text-2xl", gap: "gap-2.5" },
    lg: { icon: 36, text: "text-5xl", gap: "gap-4" }
  }[size];

  return (
    <div className={cn("flex items-center", dimensions.gap, className)}>
      <div className="text-rose-500">
        <HeartPulse size={dimensions.icon} strokeWidth={2.5} />
      </div>
      <span className={cn("font-bold tracking-tight text-slate-900 dark:text-white", dimensions.text)}>
        Cuore
      </span>
    </div>
  );
}
