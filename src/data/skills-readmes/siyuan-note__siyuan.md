<p align="center">
<img alt="SiYuan" src="https://b3log.org/images/brand/siyuan-128.png">
<br>
<em>From thought to insight, with agents</em>
<br><br>
<a title="Build Status" target="_blank" href="https://github.com/siyuan-note/siyuan/actions/workflows/cd.yml"><img src="https://img.shields.io/github/actions/workflow/status/siyuan-note/siyuan/cd.yml?style=flat-square"></a>
<a title="Releases" target="_blank" href="https://github.com/siyuan-note/siyuan/releases"><img src="https://img.shields.io/github/release/siyuan-note/siyuan.svg?style=flat-square&color=9CF"></a>
<a title="Downloads" target="_blank" href="https://github.com/siyuan-note/siyuan/releases"><img src="https://img.shields.io/github/downloads/siyuan-note/siyuan/total.svg?style=flat-square&color=blueviolet"></a>
<br>
<a title="Docker Pulls" target="_blank" href="https://hub.docker.com/r/b3log/siyuan"><img src="https://img.shields.io/docker/pulls/b3log/siyuan.svg?style=flat-square&color=green"></a>
<a title="Docker Image Size" target="_blank" href="https://hub.docker.com/r/b3log/siyuan"><img src="https://img.shields.io/docker/image-size/b3log/siyuan.svg?style=flat-square&color=ff96b4"></a>
<a title="Hits" target="_blank" href="https://github.com/siyuan-note/siyuan"><img src="https://hits.b3log.org/siyuan-note/siyuan.svg"></a>
<br>
<a title="AGPLv3" target="_blank" href="https://www.gnu.org/licenses/agpl-3.0.txt"><img src="http://img.shields.io/badge/license-AGPLv3-orange.svg?style=flat-square"></a>
<a title="Code Size" target="_blank" href="https://github.com/siyuan-note/siyuan"><img src="https://img.shields.io/github/languages/code-size/siyuan-note/siyuan.svg?style=flat-square&color=yellow"></a>
<a title="GitHub Pull Requests" target="_blank" href="https://github.com/siyuan-note/siyuan/pulls"><img src="https://img.shields.io/github/issues-pr-closed/siyuan-note/siyuan.svg?style=flat-square&color=FF9966"></a>
<br>
<a title="GitHub Commits" target="_blank" href="https://github.com/siyuan-note/siyuan/commits/master"><img src="https://img.shields.io/github/commit-activity/m/siyuan-note/siyuan.svg?style=flat-square"></a>
<a title="Last Commit" target="_blank" href="https://github.com/siyuan-note/siyuan/commits/master"><img src="https://img.shields.io/github/last-commit/siyuan-note/siyuan.svg?style=flat-square&color=FF9900"></a>
<br><br>
<a title="X" target="_blank" href="https://x.com/b3logos"><img alt="X Follow" src="https://img.shields.io/twitter/follow/b3logos?label=Follow&style=social"></a>
<br><br>
<a href="https://trendshift.io/repositories/3949" target="_blank"><img src="https://trendshift.io/api/badge/repositories/3949" alt="siyuan-note%2Fsiyuan | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>
</p>

<p align="center">
<b>English</b>
| <a href="README.zh-CN.md">中文</a>
| <a href="README.ja.md">日本語</a>
| <a href="README.tr.md">Türkçe</a>
</p>

---

## Table of Contents

- [💡 Introduction](#-introduction)
- [🔮 Features](#-features)
- [🏗️ Architecture and Ecosystem](#-architecture-and-ecosystem)
- [🗺️ Roadmap](#️-roadmap)
- [🚀 Download Setup](#-download-setup)
  - [App Market](#app-market)
  - [Installation Package](#installation-package)
  - [Package Manager](#package-manager)
  - [Docker Hosting](#docker-hosting)
  - [Unraid Hosting](#unraid-hosting)
  - [TrueNAS Hosting](#truenas-hosting)
  - [Test Channels](#test-channels)
- [⌨️ Command-line Interface](#-command-line-interface)
- [🏘️ Community](#️-community)
- [🛠️ Development Guide](#️-development-guide)
- [❓ FAQ](#-faq)
  - [How does SiYuan store data?](#how-does-siyuan-store-data)
  - [Does it support data synchronization through a third-party sync disk?](#does-it-support-data-synchronization-through-a-third-party-sync-disk)
  - [Is SiYuan open source?](#is-siyuan-open-source)
  - [How to upgrade to a new version?](#how-to-upgrade-to-a-new-version)
  - [What if some blocks (such as paragraph blocks in list items) cannot find the block icon?](#what-if-some-blocks-such-as-paragraph-blocks-in-list-items-cannot-find-the-block-icon)
  - [What should I do if the data repo key is lost?](#what-should-i-do-if-the-data-repo-key-is-lost)
  - [Do I need to pay for it?](#do-i-need-to-pay-for-it)
- [🙏 Acknowledgement](#-acknowledgement)
  - [Contributors](#contributors)

---

## 💡 Introduction

SiYuan is a privacy-first personal knowledge management system, supporting fine-grained block-level reference and Markdown
WYSIWYG.

![feature0.png](screenshots/feature0.png)

![feature5-1.png](screenshots/feature5-1.png)

To learn more, read the [online user guide](https://siyuan-en.b3log.org/) or join the [SiYuan English Discussion Forum](https://liuyun.io).

## 🔮 Features

Most features are free, even for commercial use.

- Content block
  - Block-level reference and two-way links
  - Custom attributes
  - SQL query embed
  - Protocol `siyuan://`
- Editor
  - Block-style
  - Markdown WYSIWYG
  - List outline
  - Block zoom-in
  - Million-word large document editing
  - Mathematical formulas, charts, flowcharts, Gantt charts, timing charts, staves, etc.
  - Web clipping
  - PDF Annotation link
- Export
  - Block ref and embed
  - Standard Markdown with assets
  - PDF, Word and HTML
  - Copy to WeChat MP, Zhihu and Yuque
- Database
  - Table view
- Flashcard spaced repetition
- AI writing and Q/A chat via OpenAI API
- Tesseract OCR 
- Multi-tab, drag and drop to split screen
- Template snippet
- JavaScript/CSS snippet
- Android/iOS/HarmonyOS App
- Docker deployment
- [API](https://github.com/siyuan-note/siyuan/blob/master/docs/API.md)
- Community marketplace

Some features are only available to paid members, for more details please refer to [Pricing](https://b3log.org/siyuan/en/pricing.html).

## 🏗️ Architecture and Ecosystem

![SiYuan Arch](screenshots/SiYuan_Arch.png "SiYuan Arch")

| Project                                                  | Description           | Forks                                                                           | Stars                                                                                | 
|----------------------------------------------------------|-----------------------|---------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| [lute](https://github.com/88250/lute)                    | Editor engine         | ![GitHub forks](https://img.shields.io/github/forks/88250/lute)                 | ![GitHub Repo stars](https://img.shields.io/github/stars/88250/lute)                 |
| [chrome](https://github.com/siyuan-note/siyuan-chrome)   | Chrome/Edge extension | ![GitHub forks](https://img.shields.io/github/forks/siyuan-note/siyuan-chrome)  | ![GitHub Repo stars](https://img.shields.io/github/stars/siyuan-note/siyuan-chrome)  |
| [bazaar](https://github.com/siyuan-note/bazaar)          | Community marketplace | ![GitHub forks](https://img.shields.io/github/forks/siyuan-note/bazaar)         | ![GitHub Repo stars](https://img.shields.io/github/stars/siyuan-note/bazaar)         |
| [dejavu](https://github.com/siyuan-note/dejavu)          | Data repo             | ![GitHub forks](https://img.shields.io/github/forks/siyuan-note/dejavu)         | ![GitHub Repo stars](https://img.shields.io/github/stars/siyuan-note/dejavu)         |
| [petal](https://github.com/siyuan-note/petal)            | Plugin API            | ![GitHub forks](https://img.shields.io/github/forks/siyuan-note/petal)          | ![GitHub Repo stars](https://img.shields.io/github/stars/siyuan-note/petal)          |
| [android](https://github.com/siyuan-note/siyuan-android) | Android App           | ![GitHub forks](https://img.shields.io/github/forks/siyuan-note/siyuan-android) | ![GitHub Repo stars](https://img.shields.io/github/stars/siyuan-note/siyuan-android) |
| [ios](https://github.com/siyuan-note/siyuan-ios)         | iOS App               | ![GitHub forks](https://img.shields.io/github/forks/siyuan-note/siyuan-ios)     | ![GitHub Repo stars](https://img.shields.io/github/stars/siyuan-note/siyuan-ios)     |
| [harmony](https://github.com/siyuan-note/siyuan-harmony) | HarmonyOS App         | ![GitHub forks](https://img.shields.io/github/forks/siyuan-note/siyuan-harmony) | ![GitHub Repo stars](https://img.shields.io/github/stars/siyuan-note/siyuan-harmony) |
| [riff](https://github.com/siyuan-note/riff)              | Spaced repetition     | ![GitHub forks](https://img.shields.io/github/forks/siyuan-note/riff)           | ![GitHub Repo stars](https://img.shields.io/github/stars/siyuan-note/riff)           |

## 🗺️ Roadmap

- [SiYuan development plan and progress](https://github.com/orgs/siyuan-note/projects/1)
- [SiYuan changelog](CHANGELOG.md)

## 🚀 Download Setup

It is recommended to give priority to installing through the application market on desktop and mobile, so that you can upgrade the version with one click in the future.

### App Market

Mobile:

- [App Store](https://apps.apple.com/us/app/siyuan/id1583226508)
- [Google Play](https://play.google.com/store/apps/details?id=org.b3log.siyuan)
- [F-Droid](https://f-droid.org/packages/org.b3log.siyuan)

Desktop:

- [Microsoft Store](https://apps.microsoft.com/detail/9p7hpmxp73k4)

### Installation Package

- [B3log](https://b3log.org/siyuan/en/download.html)
- [GitHub](https://github.com/siyuan-note/siyuan/releases)

### Package Manager

#### `siyuan`

[![Packaging status](https://repology.org/badge/vertical-allrepos/siyuan.svg)](https://repology.org/project/siyuan/versions)

#### `siyuan-note`

[![Packaging status](https://repology.org/badge/vertical-allrepos/siyuan-note.svg)](https://repology.org/project/siyuan-note/versions)

### Docker Hosting

<details>
<summary>Docker Deployment</summary>

#### Overview

The easiest way to serve SiYuan on a server is to deploy it through Docker.

- Image name `b3log/siyuan`
- [Image URL](https://hub.docker.com/r/b3log/siyuan)

#### File structure

The overall program is located under `/opt/siyuan/`, which is basically the structure under the resources folder of the Electron installation package:

- appearance: icon, theme, languages
- guide: user guide document
- stage: interface and static resources
- kernel: kernel program

#### Entrypoint

The entry point is set when building the Docker image: `ENTRYPOINT ["/opt/siyuan/entrypoint.sh"]`. This script allows changing the `PUID` and `PGID` of the user that will run inside the container. This is especially relevant to solve permission issues when mounting directories from the host. The `PUID` (User ID) and `PGID` (Group ID) can be passed as environment variables, making it easier to ensure correct permissions when accessing host-mounted directories.

Use the following parameters when running the container with `docker run b3log/siyuan`:

> **Note:** Since v3.7.0, the `serve` subcommand must be passed explicitly (e.g. `docker run b3log/siyuan serve --workspace=...`). Run `docker run --rm b3log/siyuan serve --help` to see all serving options.

- `--workspace`: Specifies the workspace folder path, mounted to the container via `-v` on the host
- `--accessAuthCode`: Specifies the lock screen password

More parameters can be found using `--help`. Here’s an example of a startup command with the new environment variables:

```bash
docker run -d \
  -v workspace_dir_host:workspace_dir_container \
  -p 6806:6806 \
  -e PUID=1001 -e PGID=1002 \
  b3log/siyuan \
  serve \
  --workspace=workspace_dir_container \
  --accessAuthCode=xxx
```

- `PUID`: Custom user ID (optional, defaults to `1000` if not provided)
- `PGID`: Custom group ID (optional, defaults to `1000` if not provided)
- `workspace_dir_host`: The workspace folder path on the host
- `workspace_dir_container`: The path of the workspace folder in the container, as specified in `--workspace`
  - Alternatively, it's possible to set the path via the `SIYUAN_WORKSPACE_PATH` env variable. The commandline will always have the priority, if both are set
- `accessAuthCode`: Lock screen password (please **be sure to modify**, otherwise anyone can access your data)
  - Alternatively, it's possible to set the lock screen password via the `SIYUAN_ACCESS_AUTH_CODE` env variable. The commandline will always have the priority, if both are set
  - To disable the lock screen password set the env variable `SIYUAN_ACCESS_AUTH_CODE_BYPASS=true`
- OIDC can replace the lock screen password as the required Docker access authentication. Set `SIYUAN_OIDC_ENABLED=true`, `SIYUAN_OIDC_PROVIDER` (`custom`, `google`, `microsoft`, or `github`), `SIYUAN_OIDC_CLIENT_ID`, and the provider-specific values below. GitHub uses its OAuth 2.0 user API adapter; the other providers use OpenID Connect discovery and ID Token validation. An invalid enabled configuration stops Docker startup when no lock screen password is available
  - `SIYUAN_OIDC_ISSUER_URL`: Issuer URL required by the `custom` and `microsoft` providers; Microsoft must use a tenant-specific issuer such as `https://login.microsoftonline.com/<tenant-id>/v2.0`
  - `SIYUAN_OIDC_CLIENT_SECRET`: Optional client secret for OpenID Connect providers; required by the GitHub OAuth adapter. Every authorization-code flow also uses PKCE
  - `SIYUAN_OIDC_SCOPES`: Comma- or space-separated scopes; `openid` is always included
  - `SIYUAN_OIDC_REDIRECT_URL`: Public HTTPS callback URL ending in `/api/system/oidc/callback`, required for remote browser access
  - `SIYUAN_OIDC_ALLOW_ALL`: Explicitly grant SiYuan administrator access to every identity authenticated by the provider
  - `SIYUAN_OIDC_CLAIM_RULES`: JSON array of claim rules used when allow-all is disabled, for example `[{"claim":"email","operator":"equals","values":["user@example.com"]},{"claim":"email_verified","operator":"equals","values":["true"]}]`; values within a rule use OR, while rules use AND
  - Native mobile apps use the fixed callback URI `siyuan:/oidc-callback`; register it exactly as written. Mobile configuration verification uses this callback before saving. Custom providers, Microsoft, and GitHub can be used only when their application registration accepts this callback URI. Google does not accept this private-use URI for its Android client type, so Google login is limited to browser and desktop flows
- `SIYUAN_LANG`: Interface language (optional, defaults to `en` if unset in Docker). Accepts BCP 47 tags like `zh-CN`/`zh-TW`/`en`/`ja`/`pt-BR`; legacy underscore values like `zh_CN`/`en_US` are also accepted for backward compatibility. Omit it if you want the language chosen in **Settings** to persist across restarts; if set, it is applied on every startup and overrides the saved setting
  - Alternatively, use the `--lang` command-line parameter. If both are set, the command-line takes priority

To simplify things, it is recommended to configure the workspace folder path to be consistent on the host and container, such as having both `workspace_dir_host` and `workspace_dir_container` configured a

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
