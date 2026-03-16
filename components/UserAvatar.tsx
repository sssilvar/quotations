"use client";

import { cn } from "@/lib/utils";

function getInitials(name?: string | null, username?: string | null) {
  const source = (name || username || "?").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function UserAvatar({
  name,
  username,
  image,
  className,
}: {
  name?: string | null;
  username?: string | null;
  image?: string | null;
  className?: string;
}) {
  const initials = getInitials(name, username);

  return (
    <div
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-foreground ring-1 ring-border",
        className,
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name || username || "Avatar"} className="size-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
