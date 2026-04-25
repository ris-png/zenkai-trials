import type { StaticImageData } from "next/image";

import dabiBossArt from "../../../assets/bosses/dabi.png";
import kisameBossArt from "../../../assets/bosses/kisame.png";
import mahoragaBossArt from "../../../assets/bosses/mahoraga.png";
import getoSuguruPortrait from "../../../assets/characters/geto_suguru.png";
import gojoSatoruPortrait from "../../../assets/characters/gojo_satoru.png";
import makiZeninPortrait from "../../../assets/characters/maki_zenin.png";
import nanaoIsePortrait from "../../../assets/characters/nanao_ise.png";
import rimuruPortrait from "../../../assets/characters/rimuru.png";
import rirukaPortrait from "../../../assets/characters/riruka.png";
import shionPortrait from "../../../assets/characters/shion.png";
import shizuePortrait from "../../../assets/characters/shizue.png";
import ulquiorraPortrait from "../../../assets/characters/ulquiorra.png";

interface ArtEntity {
  id?: string;
  name: string;
}

const characterArtRegistry: Record<string, StaticImageData> = {
  "geto-suguru": getoSuguruPortrait,
  "gojo-satoru": gojoSatoruPortrait,
  "maki-zenin": makiZeninPortrait,
  "nanao-ise": nanaoIsePortrait,
  "rimuru-tempest": rimuruPortrait,
  "riruka-dokugamine": rirukaPortrait,
  shion: shionPortrait,
  "shizue-izawa": shizuePortrait,
  "ulquiorra-cifer": ulquiorraPortrait,
};

const bossArtRegistry: Record<string, StaticImageData> = {
  dabi: dabiBossArt,
  kisame: kisameBossArt,
  mahoraga: mahoragaBossArt,
};

export function getCharacterArtwork(entity: ArtEntity): StaticImageData | undefined {
  return resolveArtwork(entity, characterArtRegistry);
}

export function getBossArtwork(entity: ArtEntity): StaticImageData | undefined {
  return resolveArtwork(entity, bossArtRegistry) ?? getCharacterArtwork(entity);
}

function resolveArtwork(
  entity: ArtEntity,
  registry: Record<string, StaticImageData>,
): StaticImageData | undefined {
  const candidates = buildLookupCandidates(entity);

  for (const candidate of candidates) {
    if (candidate in registry) {
      return registry[candidate];
    }
  }

  return undefined;
}

function buildLookupCandidates(entity: ArtEntity): string[] {
  return Array.from(
    new Set(
      [entity.id, entity.name]
        .filter((value): value is string => Boolean(value))
        .flatMap((value) => {
          const normalized = normalizeArtKey(value);
          const condensed = normalized.replace(/-/g, "");
          return [normalized, condensed];
        }),
    ),
  );
}

function normalizeArtKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
