"use client";

import Image from "next/image";
import { useState } from "react";

export function AgentAvatar({ author, className, size = 80 }: { author: string; className?: string; size?: number }) {
  const [state, setState] = useState<"idle" | "loaded" | "error">("idle");
  return (
    <span className={`skill-avatar-lazy ${className ?? ""}`} data-avatar-state={state} role="img" aria-label={`${author} 的 GitHub 头像`}>
      <span className="skill-avatar-fallback" aria-hidden="true">{author.trim().charAt(0).toUpperCase() || "?"}</span>
      <Image
        className="skill-avatar-image"
        src={`https://github.com/${encodeURIComponent(author)}.png?size=${size}`}
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        unoptimized
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
      />
    </span>
  );
}
