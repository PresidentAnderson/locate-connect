"use client";

import type { HTMLAttributes } from "react";
import { containsSyllabics } from "@/config/languages";
import { cn } from "@/lib/utils/cn";

interface SyllabicsTextProps extends HTMLAttributes<HTMLSpanElement> {
  text: string;
}

export function SyllabicsText({
  text,
  className,
  ...props
}: SyllabicsTextProps) {
  const hasSyllabics = containsSyllabics(text);

  return (
    <span
      {...props}
      data-syllabics={hasSyllabics}
      className={cn(className, hasSyllabics && "font-syllabics")}
    >
      {text}
    </span>
  );
}
