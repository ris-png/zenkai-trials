import Image from "next/image";

import {
  getBossArtwork,
  getCharacterArtwork,
} from "../../lib/assets/battle-art";

interface ArtEntity {
  id?: string;
  name: string;
}

interface BattleArtworkProps {
  entity: ArtEntity;
  variant: "character" | "boss";
  alt: string;
  className?: string;
  imageClassName?: string;
  overlayClassName?: string;
  priority?: boolean;
}

export function BattleArtwork({
  entity,
  variant,
  alt,
  className = "",
  imageClassName = "",
  overlayClassName = "",
  priority = false,
}: BattleArtworkProps) {
  const art =
    variant === "boss" ? getBossArtwork(entity) : getCharacterArtwork(entity);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {art ? (
        <Image
          src={art}
          alt={alt}
          fill
          priority={priority}
          sizes={variant === "boss" ? "(min-width: 1024px) 55vw, 100vw" : "(min-width: 1280px) 22vw, 40vw"}
          className={`object-cover ${imageClassName}`}
        />
      ) : (
        <FallbackArtwork label={entity.name} />
      )}
      <div className={`pointer-events-none absolute inset-0 ${overlayClassName}`} />
    </div>
  );
}

function FallbackArtwork({ label }: { label: string }) {
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),rgba(15,23,42,0.1)_58%),linear-gradient(145deg,rgba(15,23,42,0.1),rgba(255,255,255,0.35))]">
      <div className="rounded-full border border-white/55 bg-white/60 px-5 py-4 text-center shadow-[0_18px_30px_rgba(15,23,42,0.12)] backdrop-blur-sm">
        <p className="text-2xl font-semibold tracking-[0.18em] text-slate-700">
          {initials || "ZT"}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Artwork Pending
        </p>
      </div>
    </div>
  );
}
