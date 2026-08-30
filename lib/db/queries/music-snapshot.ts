import { sql, type SQL, type SQLWrapper } from "drizzle-orm";

type NullableString = string | null;

export type AlbumMutableFields = {
  artist: string;
  cover: NullableString;
  color: NullableString;
  order: number;
  releaseDate: Date | null;
};

export type TrackMutableFields = {
  duration: NullableString;
  durationSeconds: number | null;
  url: NullableString;
  externalUrl: NullableString;
  sourceType: "upload" | "external";
  trackNumber: number;
};

/**
 * Builds the SQL ordering value for a mutable integer stored in a music
 * revision. Public queries must sort by the selected published revision, not
 * by the normalized side table, which may already contain a newer draft.
 *
 * Old revisions predate complete snapshot metadata, so a missing, malformed,
 * non-integer (or, for tracks, non-positive) value deliberately falls back to
 * the side-table column. Invalid JSON is treated as legacy metadata rather
 * than aborting the whole public catalog query.
 */
export function musicRevisionIntegerOrder(
  metadataJson: SQLWrapper,
  key: "order" | "trackNumber",
  fallback: SQLWrapper,
  options?: { positive?: boolean },
): SQL<number> {
  const safeMetadata = sql`case
    when json_valid(${metadataJson}) then ${metadataJson}
    else '{}'
  end`;
  const path = sql.raw(`'$.${key}'`);
  const value = sql`json_extract(${safeMetadata}, ${path})`;
  const positive = options?.positive ? sql`and ${value} > 0` : sql``;

  return sql<number>`case
    when typeof(${value}) in ('integer', 'real')
      and ${value} = cast(${value} as integer)
      ${positive}
    then cast(${value} as integer)
    else ${fallback}
  end`;
}

export function parseMusicRevisionMetadata(value: string | null | undefined) {
  if (!value) return {} as Record<string, unknown>;
  try {
    const metadata: unknown = JSON.parse(value);
    return metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? metadata as Record<string, unknown>
      : {};
  } catch {
    return {} as Record<string, unknown>;
  }
}

function owns(metadata: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(metadata, key);
}

function nullableString(
  metadata: Record<string, unknown>,
  key: string,
  fallback: NullableString,
) {
  if (!owns(metadata, key)) return fallback;
  const value = metadata[key];
  return typeof value === "string" || value === null ? value : fallback;
}

function nullableInteger(
  metadata: Record<string, unknown>,
  key: string,
  fallback: number | null,
) {
  if (!owns(metadata, key)) return fallback;
  const value = metadata[key];
  return (typeof value === "number" && Number.isInteger(value)) || value === null
    ? value
    : fallback;
}

function musicDate(value: unknown): Date | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const date = new Date(
    typeof value === "number" && Math.abs(value) < 10_000_000_000
      ? value * 1_000
      : value,
  );
  return Number.isNaN(date.valueOf()) ? undefined : date;
}

/**
 * Reconstructs the immutable album snapshot selected by a revision pointer.
 *
 * New revisions carry every mutable field in metadata. Side tables remain a
 * compatibility fallback for revisions created before snapshot metadata was
 * introduced; an explicit metadata `null` must therefore never fall through.
 */
export function albumMutableFieldsFromRevision(
  metadataJson: string | null | undefined,
  fallback: AlbumMutableFields,
): AlbumMutableFields {
  const metadata = parseMusicRevisionMetadata(metadataJson);
  const releaseDate = owns(metadata, "releaseDate")
    ? musicDate(metadata.releaseDate)
    : undefined;
  return {
    artist: typeof metadata.artist === "string" ? metadata.artist : fallback.artist,
    cover: nullableString(metadata, "cover", fallback.cover),
    color: nullableString(metadata, "color", fallback.color),
    order: typeof metadata.order === "number" && Number.isInteger(metadata.order)
      ? metadata.order
      : fallback.order,
    releaseDate: releaseDate === undefined ? fallback.releaseDate : releaseDate,
  };
}

/** Same revision-first compatibility rule as albums, for track playback data. */
export function trackMutableFieldsFromRevision(
  metadataJson: string | null | undefined,
  fallback: TrackMutableFields,
): TrackMutableFields {
  const metadata = parseMusicRevisionMetadata(metadataJson);
  const sourceType = metadata.sourceType === "upload" || metadata.sourceType === "external"
    ? metadata.sourceType
    : fallback.sourceType;
  const trackNumber = typeof metadata.trackNumber === "number"
    && Number.isInteger(metadata.trackNumber)
    && metadata.trackNumber > 0
    ? metadata.trackNumber
    : fallback.trackNumber;
  return {
    duration: nullableString(metadata, "duration", fallback.duration),
    durationSeconds: nullableInteger(
      metadata,
      "durationSeconds",
      fallback.durationSeconds,
    ),
    url: nullableString(metadata, "url", fallback.url),
    externalUrl: nullableString(metadata, "externalUrl", fallback.externalUrl),
    sourceType,
    trackNumber,
  };
}
