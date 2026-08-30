export type MusicIconName =
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "chevron-up"
  | "order"
  | "pause"
  | "play"
  | "repeat"
  | "shuffle"
  | "skip-back"
  | "skip-forward";

const paths: Record<MusicIconName, string> = {
  "chevron-down": "m12 13.171 4.95-4.95 1.414 1.415L12 16 5.636 9.636 7.05 8.222z",
  "chevron-left": "m10.828 12 4.95 4.95-1.414 1.415L8 12l6.364-6.364 1.414 1.414z",
  "chevron-right": "m13.172 12-4.95-4.95 1.414-1.413L16 12l-6.364 6.364-1.414-1.415z",
  "chevron-up": "m12 10.828-4.95 4.95-1.414-1.414L12 8l6.364 6.364-1.414 1.414z",
  order: "M5.75 3.5H4.717l-1.467.393v1.553l1-.268V8.5H3V10h4V8.5H5.75zM10 4h11v2H10zm0 7h11v2H10zm0 7h11v2H10zm-7.125-2.375a2.125 2.125 0 1 1 3.812 1.292l-.004.006L5.316 18.5H7V20H3v-1.121l2.472-2.844a.625.625 0 1 0-1.094-.466l-.013.306h-1.49z",
  pause: "M6 5h2v14H6zm10 0h2v14h-2z",
  play: "M19.376 12.416 8.777 19.482A.5.5 0 0 1 8 19.066V4.934a.5.5 0 0 1 .777-.416l10.599 7.066a.5.5 0 0 1 0 .832",
  repeat: "M8 20v1.932a.5.5 0 0 1-.82.385l-4.12-3.433A.5.5 0 0 1 3.382 18H18a2 2 0 0 0 2-2V8h2v8a4 4 0 0 1-4 4zm8-16V2.068a.5.5 0 0 1 .82-.385l4.12 3.433a.5.5 0 0 1-.321.884H6a2 2 0 0 0-2 2v8H2V8a4 4 0 0 1 4-4z",
  shuffle: "M18 17.883V16l5 3-5 3v-2.09a9 9 0 0 1-6.997-5.365L11 14.54l-.003.006A9 9 0 0 1 2.725 20H2v-2h.725a7 7 0 0 0 6.434-4.243L9.912 12l-.753-1.757A7 7 0 0 0 2.725 6H2V4h.725a9 9 0 0 1 8.272 5.455L11 9.46l.003-.006A9 9 0 0 1 18 4.09V2l5 3-5 3V6.117a7 7 0 0 0-5.159 4.126L12.088 12l.753 1.757A7 7 0 0 0 18 17.883",
  "skip-back": "m8 11.333 10.223-6.815a.5.5 0 0 1 .777.416v14.132a.5.5 0 0 1-.777.416L8 12.667V19a1 1 0 1 1-2 0V5a1 1 0 0 1 2 0z",
  "skip-forward": "M16 12.667 5.777 19.482A.5.5 0 0 1 5 19.066V4.934a.5.5 0 0 1 .777-.416L16 11.333V5a1 1 0 1 1 2 0v14a1 1 0 1 1-2 0z",
};

/** Exact Remix Icon glyph geometry used by the Astro build. */
export function MusicIcon({ name }: { name: MusicIconName }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d={paths[name]} fill="currentColor" />
    </svg>
  );
}
