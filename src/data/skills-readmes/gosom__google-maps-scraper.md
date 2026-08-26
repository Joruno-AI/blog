# Google Maps Scraper

<p align="center">
  <a href="https://github.com/gosom/google-maps-scraper/stargazers"><img src="https://img.shields.io/github/stars/gosom/google-maps-scraper?style=social" alt="GitHub Stars"></a>
  <a href="https://github.com/gosom/google-maps-scraper/network/members"><img src="https://img.shields.io/github/forks/gosom/google-maps-scraper?style=social" alt="GitHub Forks"></a>
  <a href="https://twitter.com/intent/tweet?text=Powerful%20open-source%20Google%20Maps%20scraper%20-%20extract%20business%20data%20at%20scale%20with%20CLI%2C%20Web%20UI%2C%20or%20REST%20API&url=https%3A%2F%2Fgithub.com%2Fgosom%2Fgoogle-maps-scraper&hashtags=golang,webscraping,googlemaps,opensource"><img src="https://img.shields.io/twitter/url/http/shields.io.svg?style=social" alt="Tweet"></a>
</p>

[![Build Status](https://github.com/gosom/google-maps-scraper/actions/workflows/build.yml/badge.svg)](https://github.com/gosom/google-maps-scraper/actions/workflows/build.yml)
[![Go Report Card](https://goreportcard.com/badge/github.com/gosom/google-maps-scraper)](https://goreportcard.com/report/github.com/gosom/google-maps-scraper)
[![GoDoc](https://godoc.org/github.com/gosom/google-maps-scraper?status.svg)](https://godoc.org/github.com/gosom/google-maps-scraper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Discord](https://img.shields.io/badge/Discord-Join%20Chat-7289DA?logo=discord&logoColor=white)](https://discord.gg/fpaAVhNCCu)

Extract Google Maps business leads, emails, reviews, phone numbers, websites, ratings, coordinates, and more with a free open-source CLI, Web UI, REST API, and optional self-hosted platform.

Use it for lead generation, local business research, sales prospecting, data enrichment, or developer automation.

## Ask an AI Agent to Get Leads

The easiest way to use Google Maps Scraper is with an AI coding agent such as [Claude Code](https://claude.com/claude-code), Codex, Cursor, GitHub Copilot, or any [Agent Skills-compatible tool](https://agentskills.io). You describe the leads you want; the agent plans the searches, runs a small validation, starts the full local scrape, monitors it, and helps you work with the results.

Install the skill:

```bash
npx skills add gosom/google-maps-scraper
```

Then ask your agent in plain language:

> Find dentists in Berlin and include their websites and email addresses.

The agent automatically checks for the latest skill and Docker image, then asks only for details it still needs. For larger crawls, you can provide your own proxy, continue without one, or review three randomly selected proxy sponsors. Proxy credentials are entered through a masked local terminal prompt and are never pasted into the agent chat.

Requires Docker and Node.js on macOS, Linux, or Windows through WSL. See [how the agent workflow works](#ai-agent-skill).

| Goal | Start here |
|---|---|
| Get leads into CSV/JSON | [Command Line](#command-line) |
| Ask an AI coding agent to run a scrape | [AI Agent Skill](#ai-agent-skill) |
| Run a browser UI locally | [Web UI](#web-ui) |
| Automate scraping from your app | [REST API](#rest-api) |
| Run a multi-user scraping platform | [SaaS Edition](docs/saas.md) |
| Follow common workflows | [Recipes](docs/recipes.md) |

![Example GIF](img/example.gif)

If this project is useful to you, a GitHub star helps others discover it. Sponsorships help fund maintenance and new work.

---

## Sponsored By

<p align="center"><i>This project is made possible by our amazing sponsors</i></p>

### [Coreclaw](https://www.coreclaw.com/?utm_source=github&utm_medium=referral&utm_campaign=gosom&utm_term=&utm_id=gosom) - Full-stack web scraping and data extraction platform

[![Coreclaw - Full-stack web scraping and data extraction platform](./img/coreclaw.png)](https://www.coreclaw.com/?utm_source=github&utm_medium=referral&utm_campaign=gosom&utm_term=&utm_id=gosom)

Find ready-made workers for public websites, run them instantly, and get structured data you can export or connect anywhere. [**Get free test for $3 →**](https://www.coreclaw.com/?utm_source=github&utm_medium=referral&utm_campaign=gosom&utm_term=&utm_id=gosom)

---

### [G Maps Extractor](https://gmapsextractor.com?utm_source=github&utm_medium=banner&utm_campaign=gosom) - No-code Google Maps scraper

[![G Maps Extractor](./img/gmaps-extractor-banner.png)](https://gmapsextractor.com?utm_source=github&utm_medium=banner&utm_campaign=gosom)

Chrome extension that extracts emails, social profiles, phone numbers, reviews & more. [**Get 1,000 free leads →**](https://gmapsextractor.com?utm_source=github&utm_medium=banner&utm_campaign=gosom)

---

### [Scrap.io](https://scrap.io?utm_medium=ads&utm_source=github_gosom_gmap_scraper) - Extract ALL Google Maps listings at country-scale

[![Scrap.io - Extract ALL Google Maps Listings](./img/premium_scrap_io.png)](https://scrap.io?utm_medium=ads&utm_source=github_gosom_gmap_scraper)

No keywords needed. No limits. Export millions of businesses in 2 clicks. [**Try it free →**](https://scrap.io?utm_medium=ads&utm_source=github_gosom_gmap_scraper)

---

### [SerpApi](https://serpapi.com/?utm_source=google-maps-scraper) - Google Maps API and 30+ search engine APIs

[![SerpApi](./img/SerpApi-banner.png)](https://serpapi.com/?utm_source=google-maps-scraper)

Fast, reliable, and scalable. Used by Fortune 500 companies. [**View all APIs →**](https://serpapi.com/search-api)

---

### [SearchApi](https://www.searchapi.io/google-maps?via=gosom&utm_source=github&utm_medium=sponsorship&utm_campaign=gosom) - Google Maps API for SERP scraping

[![SearchApi](./img/searchapi_google_maps.png)](https://www.searchapi.io/google-maps?via=gosom&utm_source=github&utm_medium=sponsorship&utm_campaign=gosom)

Real-time Google Maps data with a simple integration. [**Explore the API →**](https://www.searchapi.io/google-maps?via=gosom&utm_source=github&utm_medium=sponsorship&utm_campaign=gosom)

---

### [Evomi](https://evomi.com?utm_source=github&utm_medium=banner&utm_campaign=gosom-maps) - Swiss quality proxies for scraping

[![Evomi](https://my.evomi.com/images/brand/cta.png)](https://evomi.com?utm_source=github&utm_medium=banner&utm_campaign=gosom-maps)

Swiss quality proxies from $0.49/GB across 150+ countries, with 24/7 support and 99.9% uptime. [**Visit Evomi →**](https://evomi.com?utm_source=github&utm_medium=banner&utm_campaign=gosom-maps)

---

### [HasData](https://hasdata.com/scrapers/google-maps?utm_source=github&utm_medium=sponsorship&utm_campaign=gosom) - No-code Google Maps Scraper & Email Extraction

[![HasData Google Maps Scraper](./img/hd-gm-banner.png)](https://hasdata.com/scrapers/google-maps?utm_source=github&utm_medium=sponsorship&utm_campaign=gosom)

Extract business leads, emails, addresses, phones, reviews and more. [**Get 1,000 free credits →**](https://hasdata.com/scrapers/google-maps?utm_source=github&utm_medium=sponsorship&utm_campaign=gosom)

---

### [RapidProxy](https://www.rapidproxy.io/?ref=gosom) - High-Performance Proxy Solution

[![RapidProxy](./img/rapidproxy-banner.png)](https://www.rapidproxy.io/?ref=gosom)

Unlock global access with consistent, high-speed connections from $0.65/GB, 90M+ real residential IPs worldwide, and traffic that never expires. [**Try it free →**](https://www.rapidproxy.io/?ref=gosom)

---

### [TalorData](https://talordata.com/?campaignid=f01u8cHondg2qA47&utm_source=github&utm_term=googlemaps) - Fast SERP API for Google Maps and Search Data

[![TalorData](./img/talordata.png)](https://talordata.com/?campaignid=f01u8cHondg2qA47&utm_source=github&utm_term=googlemaps)

Real-time SERP data APIs for Google Maps and search results, with structured JSON / HTML responses and 1,000 free API responses to start. [**Start using TalorData →**](https://talordata.com/?campaignid=f01u8cHondg2qA47&utm_source=github&utm_term=googlemaps) | [Learn more](talordata.md)

---

### [Webshare](https://www.webshare.io/?referral_code=0q3l81eet8mp) - Premium proxies for scraping at scale

[![Webshare](./img/webshare-banner.png)](https://www.webshare.io/?referral_code=0q3l81eet8mp)

The most affordable premium proxies across 195 countries & 80+ million IPs, plus a FREE plan for new users. [Learn more](webshare.md)

---

### [BirdProxies](https://birdproxies.com/?utm_source=github&utm_medium=sponsorship&utm_campaign=gosom-google-maps-scraper) - Residential and ISP proxies

[![BirdProxies](./img/birdproxies.png)](https://birdproxies.com/?utm_source=github&utm_medium=sponsorship&utm_campaign=gosom-google-maps-scraper)

Hey, we built BirdProxies because proxies shouldn't be complicated or overpriced. Fast residential and ISP proxies in 195+ locations, fair pricing, and real support. Try our FlappyBird game on the landing page for free data!

[**Visit BirdProxies →**](https://birdproxies.com/?utm_source=github&utm_medium=sponsorship&utm_campaign=gosom-google-maps-scraper) | [Join Discord](https://discord.com/invite/birdproxies)

---

### [Proxidize](https://proxidize.com/?utm_source=github&utm_medium=sponsorship&utm_campaign=google_maps_scraper&utm_content=gosom) - Proxies for Google Maps Scraping

[![Proxidize | Proxies for Google Maps Scraping](https://imagedelivery.net/r4caA8hJ3Ww3j8uyC_NNCA/23ee92b0-9fae-4c55-6865-9ca35387fb00/public)](https://proxidize.com/?utm_source=github&utm_medium=sponsorship&utm_campaign=google_maps_scraper&utm_content=gosom)

Mobile and residential proxies for Google Maps scraping, local SEO, lead generation, and data collection. Use code `gmaps20` for 20% off. [**Visit Proxidize →**](https://proxidize.com/?utm_source=github&utm_medium=sponsorship&utm_campaign=google_maps_scraper&utm_content=gosom)

---

### [NodeMaven](https://go.nodemaven.com/GoogleMapsScrapperaugust)

[![NodeMaven - The most efficient proxy provider for Web Scraping and Automation](./img/nodemaven.png)](https://go.nodemaven.com/GoogleMapsScrapperaugust)

[**NodeMaven**](https://go.nodemaven.com/GoogleMapsScrapperaugust): The most efficient proxy provider for Web Scraping and Automation with the Highest Quality IP on the market.

Why [**NodeMaven**](https://go.nodemaven.com/GoogleMapsScrapperaugust)?

- ZIP targeting
- 99.9% uptime
- IP filtering: all proxies have fraud score <97%
- No KYC required
- Unique free tools: Proxy Bandwidth Checker, Meta Tag Checker, IP Lookup and others!

**Special codes for Google Maps Scraper users:**

- `MAPS35` - 35% off to Mobile and Residential Proxies
- `MAPS40` - 40% off to ISP (Static) Proxies

[**Visit NodeMaven →**](https://go.nodemaven.com/GoogleMapsScrapperaugust)

---

<p align="center">
  <a href="#sponsored-by">View all sponsors</a> | <a href="https://github.com/sponsors/gosom">Become a sponsor</a>
</p>

---

## Why Use This Scraper?

| | |
|---|---|
| **Completely Free & Open Source** | MIT licensed, no hidden costs or usage limits |
| **Multiple Interfaces** | CLI, Web UI, REST API - use what fits your workflow |
| **High Performance** | ~120 places/minute with optimized concurrency |
| **33+ Data Points** | Business details, reviews, emails, coordinates, and more |
| **Production Ready** | Scale from a single machine to Kubernetes clusters |
| **Flexible Output** | CSV, JSON, PostgreSQL, S3, LeadsDB, or custom plugins |
| **Proxy Support** | Built-in SOCKS5/HTTP/HTTPS proxy rotation |

---

## What's Next After Scraping?

Once you've collected your data, you'll need to manage, deduplicate, and work with your leads. **[LeadsDB](https://getleadsdb.com/)** is a companion tool designed exactly for this:

- **Automatic Deduplication** - Import from multiple scrapes without worrying about duplicates
- **AI Agent Ready** - Query and manage leads with natural language via MCP
- **Advanced Filtering** - Combine filters with AND/OR logic on any field
- **Export Anywhere** - CSV, JSON, or use the REST API

The scraper has [built-in LeadsDB integration](#export-to-leadsdb) - just add your API key and leads flow directly into your database.

**[Start free with 500 leads](https://getleadsdb.com/)**

---

## Table of Contents

- [Quick Start](#quick-start)
  - [Command Line](#command-line)
  - [Web UI](#web-ui)
  - [REST API](#rest-api)
  - [SaaS Edition](#saas-edition)
- [AI Agent Skill](#ai-agent-skill)
- [Recipes](docs/recipes.md)
- [Proxy Sponsors](docs/proxies.md)
- [Installation](#installation)
- [Features](#features)
- [Extracted Data Points](#extracted-data-points)
- [Configuration](#configuration)
  - [Command Line Options](#command-line-options)
  - [Using Proxies](#using-proxies)
  - [Email Extraction](#email-extraction)
  - [Fast Mode](#fast-mode)
- [Export to LeadsDB](#export-to-leadsdb)
- [Advanced Usage](#advanced-usage)
  - [PostgreSQL Database Provider](#postgresql-database-provider)
  - [Kubernetes Deployment](#kubernetes-deployment)
  - [Custom Writer Plugins](#custom-writer-plugins)
- [Performance](#performance)
- [Support the Project](#support-the-project)
- [Community](#community)
- [Contributing](#contributing)
- [License](#license)

---

## Quick Start

### Command Line

```bash
mkdir -p gmaps-output

docker run \
  -v gmaps-playwright-cache:/opt \
  -v "$PWD/example-queries.txt:/queries.txt:ro" \
  -v "$PWD/gmaps-output:/out" \
  gosom/google-maps-scraper \
  -input /queries.txt \
  -results /out/results.csv \
  -depth 1 \
  -exit-on-inactivity 3m
```

Useful options:

| Need | Flag |
|---|---|
| Extract emails from business websites | `-email` |
| Write JSON instead of CSV | `-json -results /out/results.json` |
| Collect extra reviews | `-extra-reviews -json -results /out/results.json` |
| Increase concurrency | `-c 4`, `-c 8`, or `-c 16` |
| Run multiple pages per browser | `-pages-per-browser 4` |
| Limit browser processes | `-browser-pool-size 2` |
| Use proxies | `-proxies "http://user:pass@host:port,socks5://host:port"` |
| Read proxies from a credentials file | `-proxies-file /path/to/proxies.txt` |

`-c` controls how many scrape jobs run in parallel. Higher concurrency can finish large input files faster, but it also uses more CPU/RAM and can increase blocking or failures, especially without proxies. Start with the default for a first run. For larger jobs on a capable machine, try `-c 4`, `-c 8`, or `-c 16` and measure the result.

**Want to skip CSV files?** Send leads directly to [LeadsDB](https://getleadsdb.com/):

```bash
docker run \
  -v gmaps-playwright-cache:/opt \
  -v "$PWD/example-queries.txt:/queries.txt:ro" \
  gosom/google-maps-scraper \
  -input /queries.txt \
  -depth 1 \
  -leadsdb-api-key "your-api-key" \
  -exit-on-inactivity 3m
```

### Web UI

Start the web interface with a single command:

```bash
mkdir -p gmapsdata

docker run \
  -v "$PWD/gmapsdata:/gmapsdata" \
  -p 8080:8080 \
  gosom/google-maps-scraper \
  -data-folder /gmapsdata
```

Then open http://localhost:8080 in your browser.

Or download the [binary release](https://github.com/gosom/google-maps-scraper/releases) for your platform.

> **Note:** Results take a

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
