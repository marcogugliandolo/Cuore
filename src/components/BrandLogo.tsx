import { Heart } from "lucide-react";
import { cn } from "../lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function BrandLogo({ className, size = "md" }: BrandLogoProps) {
  const dimensions = {
    sm: { icon: 20, text: "text-xl", gap: "gap-2" },
    md: { icon: 24, text: "text-2xl", gap: "gap-2.5" },
    lg: { icon: 48, text: "text-5xl", gap: "gap-4" }
  }[size];

  return (
    <div className={cn("flex items-center", dimensions.gap, className)}>
      <div className="text-white">
        <Heart size={dimensions.icon} className="fill-white" strokeWidth={2.5} />
      </div>
      <span className={cn("font-black tracking-widest text-white uppercase font-[VT323]", dimensions.text)}>
        Cuore
      </span>
    </div>
  );
}
