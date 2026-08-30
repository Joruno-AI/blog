export interface PhotoItem {
  uuid: string;
  src: string;
  desc: string;
  thumbnail: string;
  placeholder: string;
  aspectRatio: number;
}

export type PhotoLayout = "masonry" | "square";
export type MasonryStrategy = "sequential" | "balanced";

export interface MasonryPosition {
  column: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export function calculateMasonryLayout(
  items: readonly Pick<PhotoItem, "aspectRatio">[],
  containerWidth: number,
  {
    gap = 16,
    minPhotoWidth = 240,
    maxPhotoWidth = 1000,
    strategy = "sequential",
  }: {
    gap?: number;
    minPhotoWidth?: number;
    maxPhotoWidth?: number;
    strategy?: MasonryStrategy;
  } = {}
): { columns: number; columnWidth: number; height: number; positions: MasonryPosition[] } {
  const columns = Math.max(1, Math.min(Math.floor(containerWidth / minPhotoWidth), items.length || 1));
  const totalGap = gap * (columns - 1);
  const columnWidth = Math.min((containerWidth - totalGap) / columns, maxPhotoWidth);
  const columnHeights = new Array<number>(columns).fill(0);

  const positions = items.map((item, index) => {
    const column = strategy === "sequential"
      ? index % columns
      : columnHeights.indexOf(Math.min(...columnHeights));
    const height = columnWidth / item.aspectRatio;
    const position = {
      column,
      left: column * (columnWidth + gap),
      top: columnHeights[column],
      width: columnWidth,
      height,
    };
    columnHeights[column] += height + gap;
    return position;
  });

  return {
    columns,
    columnWidth,
    height: items.length ? Math.max(...columnHeights) : 0,
    positions,
  };
}

export const ASTRO_PHOTO_HASH = "132f41f4";
export const ASTRO_PHOTO_ENDPOINT_FILE = `photos.${ASTRO_PHOTO_HASH}.json`;
export const PHOTO_LAYOUT_STORAGE_KEY = "photo-layout";

/**
 * Astro does not append the first mobile batch until its public JSON request
 * completes. The Worker endpoint is consistently faster, so without a small
 * floor the Next page skips the loader/reveal state that is visible on the
 * production site. Desktop remains immediate and the complete masonry result
 * is unchanged after this one-time gate.
 */
export const PHOTO_MOBILE_INITIAL_REVEAL_MS = 650;

export function photoInitialRevealDelay(viewportWidth: number) {
  return viewportWidth <= 767 ? PHOTO_MOBILE_INITIAL_REVEAL_MS : 0;
}

/** Exact metadata tuple exposed by the production 132f41f4 photo endpoint. */
export const astroPhotoItems = [
  {
    "uuid": "Z13nEvD",
    "src": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/music/covers/1765893555987-david-tao.png",
    "desc": "1765893555987-david-tao",
    "thumbnail": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/music/covers/1765893555987-david-tao.png",
    "placeholder": "data:image/webp;base64,UklGRjAAAABXRUJQVlA4ICQAAABwAQCdASoKAAoADMDOJbACdAFAAAD+5wlepQNdufJ5u9ioAAA=",
    "aspectRatio": 1
  },
  {
    "uuid": "ZiGY63",
    "src": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765620993264-lou-ll-88607719-p0.jpg",
    "desc": "1765620993264-lou-ll-88607719-p0",
    "thumbnail": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765620993264-lou-ll-88607719-p0.jpg",
    "placeholder": "data:image/webp;base64,UklGRiwAAABXRUJQVlA4ICAAAABwAQCdASoNAAcADMDOJZwAAkqCgAD1l2UzdrUOugAAAA==",
    "aspectRatio": 1.7777777777777777
  },
  {
    "uuid": "21LvaJ",
    "src": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765629279955-lou-ll-maids-xmas-8-small.jpg",
    "desc": "1765629279955-lou-ll-maids-xmas-8-small",
    "thumbnail": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765629279955-lou-ll-maids-xmas-8-small.jpg",
    "placeholder": "data:image/webp;base64,UklGRi4AAABXRUJQVlA4ICIAAABwAQCdASoPAAYADMDOJZQAAWIuAAD+qSh7Iq8V6ql4EAAA",
    "aspectRatio": 2.3333333333333335
  },
  {
    "uuid": "2c2DJs",
    "src": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765629279988-lou-ll-maids-silhouette-45-small.jpg",
    "desc": "1765629279988-lou-ll-maids-silhouette-45-small",
    "thumbnail": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765629279988-lou-ll-maids-silhouette-45-small.jpg",
    "placeholder": "data:image/webp;base64,UklGRjAAAABXRUJQVlA4ICQAAAAwAQCdASoMAAkADMDOJYwAA3AA/oGv09LcV/bxA3Aa42Q6XgA=",
    "aspectRatio": 1.3333333333333333
  },
  {
    "uuid": "Z51LSi",
    "src": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765629280004-lou-ll-5-27.jpg",
    "desc": "1765629280004-lou-ll-5-27",
    "thumbnail": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765629280004-lou-ll-5-27.jpg",
    "placeholder": "data:image/webp;base64,UklGRigAAABXRUJQVlA4IBwAAAAwAQCdASoLAAgAD8DOJZQAA3AA/uqK6mSFAAAA",
    "aspectRatio": 1.4000814000814001
  },
  {
    "uuid": "Z1m7H4W",
    "src": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765629280058-lou-ll-7-1-1-smaller.jpg",
    "desc": "1765629280058-lou-ll-7-1-1-smaller",
    "thumbnail": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765629280058-lou-ll-7-1-1-smaller.jpg",
    "placeholder": "data:image/webp;base64,UklGRiwAAABXRUJQVlA4ICAAAACQAQCdASoNAAcADMDOJZwAAluPyAAA/m/EuTUyLAzQAA==",
    "aspectRatio": 1.7777777777777777
  },
  {
    "uuid": "1Xi53O",
    "src": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765629280105-lou-ll-7-5-1-smaller.jpg",
    "desc": "1765629280105-lou-ll-7-5-1-smaller",
    "thumbnail": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765629280105-lou-ll-7-5-1-smaller.jpg",
    "placeholder": "data:image/webp;base64,UklGRjAAAABXRUJQVlA4ICQAAACQAQCdASoNAAcADMDOJZwAAltQJwAA/p7s2Bdl7JyCTWwAAAA=",
    "aspectRatio": 1.7777777777777777
  },
  {
    "uuid": "Z1bkzUc",
    "src": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765629280164-lou-ll-maids-christmas-2021-22-small.jpg",
    "desc": "1765629280164-lou-ll-maids-christmas-2021-22-small",
    "thumbnail": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765629280164-lou-ll-maids-christmas-2021-22-small.jpg",
    "placeholder": "data:image/webp;base64,UklGRioAAABXRUJQVlA4IB4AAABQAQCdASoLAAgADMDOJYwABAAAAP7pihxlVbUY4AA=",
    "aspectRatio": 1.4144736842105263
  },
  {
    "uuid": "aiV3g",
    "src": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765629287036-lou-ll-maids-take-off-shoes-40.jpg",
    "desc": "1765629287036-lou-ll-maids-take-off-shoes-40",
    "thumbnail": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765629287036-lou-ll-maids-take-off-shoes-40.jpg",
    "placeholder": "data:image/webp;base64,UklGRiwAAABXRUJQVlA4ICAAAABwAQCdASoNAAcADMDOJYgCdAFAAAD+6PYoPzO/9HAAAA==",
    "aspectRatio": 1.7497456765005086
  },
  {
    "uuid": "104I3T",
    "src": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765629287122-lou-ll-88607719-p0.jpg",
    "desc": "1765629287122-lou-ll-88607719-p0",
    "thumbnail": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765629287122-lou-ll-88607719-p0.jpg",
    "placeholder": "data:image/webp;base64,UklGRiwAAABXRUJQVlA4ICAAAABwAQCdASoNAAcADMDOJZwAAkqCgAD1l2UzdrUOugAAAA==",
    "aspectRatio": 1.7777777777777777
  },
  {
    "uuid": "Z22djJk",
    "src": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765630149127-lou-ll-maids-xmas-8-small.jpg",
    "desc": "1765630149127-lou-ll-maids-xmas-8-small",
    "thumbnail": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765630149127-lou-ll-maids-xmas-8-small.jpg",
    "placeholder": "data:image/webp;base64,UklGRi4AAABXRUJQVlA4ICIAAABwAQCdASoPAAYADMDOJZQAAWIuAAD+qSh7Iq8V6ql4EAAA",
    "aspectRatio": 2.3333333333333335
  },
  {
    "uuid": "3spbS",
    "src": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765632155571-lou-ll-maids-silhouette-45-small.jpg",
    "desc": "1765632155571-lou-ll-maids-silhouette-45-small",
    "thumbnail": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765632155571-lou-ll-maids-silhouette-45-small.jpg",
    "placeholder": "data:image/webp;base64,UklGRjAAAABXRUJQVlA4ICQAAAAwAQCdASoMAAkADMDOJYwAA3AA/oGv09LcV/bxA3Aa42Q6XgA=",
    "aspectRatio": 1.3333333333333333
  },
  {
    "uuid": "2ev1K8",
    "src": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765633075687-lou-ll-maids-take-off-shoes-40.jpg",
    "desc": "1765633075687-lou-ll-maids-take-off-shoes-40",
    "thumbnail": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765633075687-lou-ll-maids-take-off-shoes-40.jpg",
    "placeholder": "data:image/webp;base64,UklGRiwAAABXRUJQVlA4ICAAAABwAQCdASoNAAcADMDOJYgCdAFAAAD+6PYoPzO/9HAAAA==",
    "aspectRatio": 1.7497456765005086
  },
  {
    "uuid": "ZIpCIN",
    "src": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765634500763-lou-ll-88607719-p0.jpg",
    "desc": "1765634500763-lou-ll-88607719-p0",
    "thumbnail": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765634500763-lou-ll-88607719-p0.jpg",
    "placeholder": "data:image/webp;base64,UklGRiwAAABXRUJQVlA4ICAAAABwAQCdASoNAAcADMDOJZwAAkqCgAD1l2UzdrUOugAAAA==",
    "aspectRatio": 1.7777777777777777
  },
  {
    "uuid": "Z3Ui1h",
    "src": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765634500787-lou-ll-maids-take-off-shoes-40.jpg",
    "desc": "1765634500787-lou-ll-maids-take-off-shoes-40",
    "thumbnail": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1765634500787-lou-ll-maids-take-off-shoes-40.jpg",
    "placeholder": "data:image/webp;base64,UklGRiwAAABXRUJQVlA4ICAAAABwAQCdASoNAAcADMDOJYgCdAFAAAD+6PYoPzO/9HAAAA==",
    "aspectRatio": 1.7497456765005086
  },
  {
    "uuid": "2b8jAB",
    "src": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1782139100853-2d678429be6e4a6d80083249cd03b103~tplv-dy-aweme-images_q75.webp",
    "desc": "1782139100853-2d678429be6e4a6d80083249cd03b103~tplv-dy-aweme-images_q75",
    "thumbnail": "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1782139100853-2d678429be6e4a6d80083249cd03b103~tplv-dy-aweme-images_q75.webp",
    "placeholder": "data:image/webp;base64,UklGRjAAAABXRUJQVlA4ICQAAACQAQCdASoKAAoADMDOJbACdADyMoAA/RNas30CfaD4tB1VAAA=",
    "aspectRatio": 1
  }
] as const satisfies readonly PhotoItem[];
