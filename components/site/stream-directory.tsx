import { Fragment, type CSSProperties } from "react";

import {
  ExternalLinkIcon,
  StreamArrowIcon,
  StreamFilmIcon,
  StreamRadioIcon,
} from "@/components/site/projects-streams-icons";
import { StreamYearNavigation } from "@/components/site/stream-year-navigation";
import {
  formatAstroStreamDate,
  groupAstroStreams,
  restoreAstroStreams,
} from "@/lib/parity/projects-streams";
import type { PublishedResource } from "@/modules/resources/infrastructure/resource-repository";

export function StreamDirectory({ resources }: { resources: PublishedResource[] }) {
  const groups = groupAstroStreams(restoreAstroStreams(resources));
  const years = groups.map(({ year }) => year);

  if (!groups.length) return <div className="legacy-empty">nothing here yet</div>;

  return (
    <>
      <StreamYearNavigation years={years} />
      <div className="stream-list" aria-label="Stream list">
        {groups.map(({ year, startIndex, items }) => (
          <Fragment key={year}>
            <div
              id={year}
              className="toc-heading stream-year-heading slide-enter"
              style={{ "--enter-stage": startIndex - 2 } as CSSProperties}
            >
              <span>{year}</span>
            </div>
            {items.map((item, itemIndex) => {
              const index = startIndex + itemIndex;
              const dateTime = new Date(`${item.pubDate}T00:00:00Z`).toISOString();
              return (
                <div
                  className="stream-list-item slide-enter"
                  style={{ "--enter-stage": index % 5 } as CSSProperties}
                  key={item.id}
                >
                  <a
                    className="blog-list-link stream-item"
                    href={item.link}
                    title={item.id}
                    aria-label={item.id}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="stream-item__title-wrap">
                      <span className="stream-item__title-row">
                        <span className="stream-item__title">{item.id}</span>
                      </span>
                      <span className="stream-new-tab-icon"><ExternalLinkIcon /></span>
                    </span>
                    <span className="stream-item__meta">
                      {item.video ? (
                        <span className="stream-media-icon" title="Provided in video" aria-label="Provided in video">
                          <StreamFilmIcon />
                        </span>
                      ) : null}
                      {item.radio ? (
                        <span className="stream-media-icon" title="Provided in radio" aria-label="Provided in radio">
                          <StreamRadioIcon />
                        </span>
                      ) : null}
                      <time dateTime={dateTime}>{formatAstroStreamDate(item.pubDate)}</time>
                      <span>· {item.platform}</span>
                      <span className="stream-item__arrow"><StreamArrowIcon /></span>
                    </span>
                  </a>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </>
  );
}
