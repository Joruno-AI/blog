import Link from "next/link";

import { WarningCallout } from "@/components/site/warning-callout";

type GithubActivityEmptyProps = {
  action: "Contributing" | "Releasing";
  loader: "astro-loader-github-prs" | "astro-loader-github-releases";
};

export function GithubActivityEmpty({ action, loader }: GithubActivityEmptyProps) {
  const loaderUrl = `https://github.com/lin-stephanie/astro-loaders/tree/main/packages/${loader}`;

  return (
    <>
      <header className="prose github-activity-header">
        <h1>AstroEco is <span className="github-activity-pulse">{`${action}…`}</span></h1>
        <p>
          Display your GitHub {action === "Contributing" ? "pull requests" : "releases"} using{" "}
          <Link href={loaderUrl} target="_blank" rel="noopener noreferrer">{loader}</Link>
        </p>
      </header>
      <div className="github-activity-content">
        <WarningCallout>
          No GitHub data available for display. See{" "}
          <a href="https://astro-antfustyle-theme.vercel.app/blog/customizing-github-activity-pages/">
            Customizing GitHub Activity Pages
          </a>{" "}
          for details.
        </WarningCallout>
      </div>
    </>
  );
}
