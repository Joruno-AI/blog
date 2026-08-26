<div align="center">

![logo](./logo.png)

# MCP Toolbox for Databases

<a href="https://trendshift.io/repositories/25495" target="_blank"><img src="https://trendshift.io/api/badge/repositories/25495" alt="googleapis%2Fmcp-toolbox | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>

[![License: Apache
2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Docs](https://img.shields.io/badge/Docs-MCP_Toolbox-blue)](https://mcp-toolbox.dev/)
[![Discord](https://img.shields.io/badge/Discord-%235865F2.svg?style=flat&logo=discord&logoColor=white)](https://discord.gg/Dmm69peqjh)
[![Medium](https://img.shields.io/badge/Medium-12100E?style=flat&logo=medium&logoColor=white)](https://medium.com/@mcp_toolbox)

[![Python SDK](https://img.shields.io/pypi/v/toolbox-core?logo=python&logoColor=white&label=Python%20SDK)](https://pypi.org/project/toolbox-core/)
[![JS/TS SDK](https://img.shields.io/npm/v/@toolbox-sdk/core?logo=javascript&logoColor=white&label=JS%20SDK)](https://www.npmjs.com/package/@toolbox-sdk/core)
[![Go SDK](https://img.shields.io/github/v/release/googleapis/mcp-toolbox-sdk-go?logo=go&logoColor=white&label=Go%20SDK)](https://pkg.go.dev/github.com/googleapis/mcp-toolbox-sdk-go)
[![Java SDK](https://img.shields.io/maven-central/v/com.google.cloud.mcp/mcp-toolbox-sdk-java?logo=apache-maven&logoColor=white&label=Java%20SDK)](https://mvnrepository.com/artifact/com.google.cloud.mcp/mcp-toolbox-sdk-java)
</div>

MCP Toolbox for Databases is an open source Model Context Protocol (MCP) server that connects your AI agents, IDEs, and applications directly to your enterprise databases. 

<p align="center">
<img src="docs/en/documentation/introduction/architecture.png" alt="architecture" width="50%"/>
</p>

It serves a **dual purpose**:
1. **Ready-to-use MCP Server (Build-Time):** Instantly connect Gemini CLI, Google Antigravity, Claude Code, Codex, or other MCP clients to your databases using our *prebuilt generic tools*. Talk to your data, explore schemas, and generate code without writing boilerplate.
2. **Custom Tools Framework (Run-Time):** A robust framework to build specialized, highly secure AI tools for your production agents. Define structured queries, semantic search, and NL2SQL capabilities safely and easily.


This README provides a brief overview. For comprehensive details, see the [full documentation](https://mcp-toolbox.dev/).

> [!IMPORTANT]  
> **Repository Name Update:** The `genai-toolbox` repository has been officially renamed to `mcp-toolbox`. To ensure your local environment reflects the new name, you may update your remote:
> `git remote set-url origin https://github.com/googleapis/mcp-toolbox.git`

> [!NOTE]
> This solution was originally named “Gen AI Toolbox for Databases” (github.com/googleapis/genai-toolbox) as its initial development predated MCP, but was renamed to align with the MCP compatibility.

<!-- TOC ignore:true -->
## Table of Contents

- [Why MCP Toolbox?](#why-mcp-toolbox)
- [Quick Start: Prebuilt Tools](#quick-start-prebuilt-tools)
- [Quick Start: Custom Tools](#quick-start-custom-tools)
- [Install & Run the Toolbox server](#install--run-the-toolbox-server)
- [Connect to Toolbox](#connect-to-toolbox)
  - [MCP Client](#mcp-client)
  - [Toolbox SDKs: Integrate with your Application](#toolbox-sdks-integrate-with-your-application)
- [Additional Features](#additional-features)
- [Versioning](#versioning)
- [Contributing](#contributing)
- [Community](#community)

---

## Why MCP Toolbox?

- **Out-of-the-Box Database Access:** Prebuilt generic tools for instant data exploration (e.g., `list_tables`, `execute_sql`) directly from your IDE or CLI.
- **Custom Tools Framework:** Build production-ready tools with your own predefined logic, ensuring safety through Restricted Access, Structured Queries, and Semantic Search.
- **Simplified Development:** Integrate tools into your Agent Development Kit (ADK), LangChain, LlamaIndex, or custom agents in less than 10 lines of code.
- **Better Performance:** Handles connection pooling, integrated auth (IAM), and end-to-end observability (OpenTelemetry) out of the box.
- **Enhanced Security**: Integrated authentication for more secure access to your data.
- **End-to-end Observability**: Out of the box metrics and tracing with built-in support for OpenTelemetry.

---

## Quick Start: Prebuilt Tools

Stop context-switching and let your AI assistant become a true co-developer. By connecting your IDE to your databases with MCP Toolbox, you can query your data in plain English, automate schema discovery and management, and generate database-aware code.

You can use the Toolbox in any MCP-compatible IDE or client (e.g., Gemini CLI, Google Antigravity, Claude Code, Codex, etc.) by configuring the MCP server.

**Prebuilt tools are also conveniently available via the [Google Antigravity MCP Store](https://antigravity.google/docs/mcp) with a simple click-to-install experience.**

1. Add the following to your client's MCP configuration file (usually `mcp.json` or `claude_desktop_config.json`):

    ```json
    {
      "mcpServers": {
        "toolbox-postgres": {
          "command": "npx",
          "args": [
            "-y",
            "@toolbox-sdk/server",
            "--prebuilt=postgres",
            "--stdio"
          ]
        }
      }
    }
    ```

2. Set the appropriate environment variables to connect, see the [Prebuilt Tools Reference](https://mcp-toolbox.dev/documentation/configuration/prebuilt-configs/).

When you run Toolbox with a `--prebuilt=<database>` flag, you instantly get access to standard tools to interact with that database. You can also specify a specific toolset using the `--prebuilt=<database>/<toolset>` syntax (e.g., `--prebuilt=postgres/data` to only load SQL tools). 

Supported databases currently include:
- **Google Cloud:** AlloyDB, BigQuery, Cloud SQL (PostgreSQL, MySQL, SQL Server), Spanner, Firestore, Knowledge Catalog (formerly known as Dataplex).
- **Other Databases:** PostgreSQL, MySQL, [MariaDB](https://mcp-toolbox.dev/integrations/mariadb/source/), SQL Server, Oracle, MongoDB, Redis, Elasticsearch, CockroachDB, ClickHouse, Couchbase, Neo4j, Snowflake, Trino, and more.

For a full list of available tools and their capabilities across all supported databases, see the [Prebuilt Tools Reference](https://mcp-toolbox.dev/documentation/configuration/prebuilt-configs/).

*See the [Install & Run the Toolbox server](#install--run-the-toolbox-server) section for different execution methods like Docker or binaries.*


> [!TIP]
> For users looking for a managed solution, [Google Cloud MCP Servers](https://cloud.google.com/blog/products/databases/managed-mcp-servers-for-google-cloud-databases) 
> provide a managed MCP experience with prebuilt tools; you can [learn more about the differences here](https://mcp-toolbox.dev/dev/reference/faq/).

---

## Quick Start: Custom Tools

Toolbox can also be used as a framework for customized tools.
The primary way to configure Toolbox is through the `tools.yaml` file. If you
have multiple files, you can tell Toolbox which to load with the `--config
tools.yaml` flag.

You can find more detailed reference documentation to all resource types in the
[Resources](https://mcp-toolbox.dev/documentation/configuration/).

### Sources

The `sources` section of your `tools.yaml` defines what data sources your
Toolbox should have access to. Most tools will have at least one source to
execute against.

```yaml
kind: source
name: my-pg-source
type: postgres
host: 127.0.0.1
port: 5432
database: toolbox_db
user: toolbox_user
password: my-password
```

For more details on configuring different types of sources, see the
[Sources](https://mcp-toolbox.dev/documentation/configuration/sources/).

### Tools

The `tools` section of a `tools.yaml` define the actions an agent can take: what
type of tool it is, which source(s) it affects, what parameters it uses, etc.

```yaml
kind: tool
name: search-hotels-by-name
type: postgres-sql
source: my-pg-source
description: Search for hotels based on name.
parameters:
  - name: name
    type: string
    description: The name of the hotel.
statement: SELECT * FROM hotels WHERE name ILIKE '%' || $1 || '%';
```

For more details on configuring different types of tools, see the
[Tools](https://mcp-toolbox.dev/documentation/configuration/tools/).

### Toolsets

The `toolsets` section of your `tools.yaml` allows you to define groups of tools
that you want to be able to load together. This can be useful for defining
different groups based on agent or application.

```yaml
kind: toolset
name: my_first_toolset
tools:
    - my_first_tool
    - my_second_tool
---
kind: toolset
name: my_second_toolset
tools:
    - my_second_tool
    - my_third_tool
```

### Prompts

The `prompts` section of a `tools.yaml` defines prompts that can be used for
interactions with LLMs.

```yaml
kind: prompt
name: code_review
description: "Asks the LLM to analyze code quality and suggest improvements."
messages:
  - content: >
         Please review the following code for quality, correctness,
         and potential improvements: \n\n{{.code}}
arguments:
  - name: "code"
    description: "The code to review"
```

For more details on configuring prompts, see the
[Prompts](https://mcp-toolbox.dev/documentation/configuration/prompts/).

---

## Install & Run the Toolbox server

You can run Toolbox directly with a [configuration file](#quick-start-custom-tools):

```sh
npx @toolbox-sdk/server --config tools.yaml
```

This runs the latest version of the Toolbox server with your configuration file.

> [!NOTE]
> This method is optimized for convenience rather than performance. 
> For a more standard and reliable installation, please use the binary
> or container image as described in [Install & Run the Toolbox server](#install--run-the-toolbox-server).

### Install Toolbox

For the latest version, check the [releases page][releases] and use the
following instructions for your OS and CPU architecture.

[releases]: https://github.com/googleapis/mcp-toolbox/releases

<details open>
<summary>Binary</summary>

To install Toolbox as a binary:

<!-- {x-release-please-start-version} -->
> <details>
> <summary>Linux (AMD64)</summary>
>
> To install Toolbox as a binary on Linux (AMD64):
>
> ```sh
> # see releases page for other versions
> export VERSION=1.9.0
> curl -L -o toolbox https://storage.googleapis.com/mcp-toolbox-for-databases/v$VERSION/linux/amd64/toolbox
> chmod +x toolbox
> ```
>
> </details>
> <details>
> <summary>macOS (Apple Silicon)</summary>
>
> To install Toolbox as a binary on macOS (Apple Silicon):
>
> ```sh
> # see releases page for other versions
> export VERSION=1.9.0
> curl -L -o toolbox https://storage.googleapis.com/mcp-toolbox-for-databases/v$VERSION/darwin/arm64/toolbox
> chmod +x toolbox
> ```
>
> </details>
> <details>
> <summary>macOS (Intel)</summary>
>
> To install Toolbox as a binary on macOS (Intel):
>
> ```sh
> # see releases page for other versions
> export VERSION=1.9.0
> curl -L -o toolbox https://storage.googleapis.com/mcp-toolbox-for-databases/v$VERSION/darwin/amd64/toolbox
> chmod +x toolbox
> ```
>
> </details>
> <details>
> <summary>Windows (Command Prompt)</summary>
>
> To install Toolbox as a binary on Windows (Command Prompt):
>
> ```cmd
> :: see releases page for other versions
> set VERSION=1.9.0
> curl -o toolbox.exe "https://storage.googleapis.com/mcp-toolbox-for-databases/v%VERSION%/windows/amd64/toolbox.exe"
> ```
>
> </details>
> <details>
> <summary>Windows (PowerShell)</summary>
>
> To install Toolbox as a binary on Windows (PowerShell):
>
> ```powershell
> # see releases page for other versions
> $VERSION = "1.9.0"
> curl.exe -o toolbox.exe "https://storage.googleapis.com/mcp-toolbox-for-databases/v$VERSION/windows/amd64/toolbox.exe"
> ```
>
> </details>
> <details>
> <summary>Windows ARM64 (Command Prompt)</summary>
>
> To install Toolbox as a binary on Windows ARM64 (Command Prompt):
>
> ```cmd
> :: see releases page for other versions
> set VERSION=1.9.0
> curl -o toolbox.exe "https://storage.googleapis.com/mcp-toolbox-for-databases/v%VERSION%/windows/arm64/toolbox.exe"
> ```
>
> </details>
> <details>
> <summary>Windows ARM64 (PowerShell)</summary>
>
> To install Toolbox as a binary on Windows ARM64 (PowerShell):
>
> ```powershell
> # see releases page for other versions
> $VERSION = "1.9.0"
> curl.exe -o toolbox.exe "https://storage.googleapis.com/mcp-toolbox-for-databases/v$VERSION/windows/arm64/toolbox.exe"
> ```
>
> </details>
</details>

<details>
<summary>Container image</summary>
You can also install Toolbox as a container:

```sh
# see releases page for other versions
export VERSION=1.9.0
docker pull us-central1-docker.pkg.dev/database-toolbox/toolbox/toolbox:$VERSION
```

</details>

<details>
<summary>Homebrew</summary>

To install Toolbox using Homebrew on macOS or Linux:

```sh
brew install mcp-toolbox
```

</details>

<details>
<summary>Compile from source</summary>

To install from source, ensure you have the latest version of
[Go installed](https://go.dev/doc/install), and then run the following command:

```sh
go install github.com/googleapis/mcp-toolbox@v1.9.0
```
<!-- {x-release-please-end} -->

</details>
<details>
<summary>Gemini CLI</summary>
Check out the [Gemini CLI extensions](https://geminicli.com/extensions/) to install prebuilt tools for specific databases like AlloyDB, BigQuery, and Cloud SQL directly into Gemini CLI.

```sh
# Install Gemini CLI
npm install -g @google/gemini-cli
# Install the extension
gemini extensions install https://github.com/gemini-cli-extensions/cloud-sql-postgres
# Run Gemini CLI
gemini
```

Interact with your custom tools using natural language through the Gemini CLI.

```sh
# Install the extension
gemini extensions install https://github.com/gemini-cli-extensions/mcp-toolbox
```
</details>


### Run Toolbox

[Configure](#quick-start-custom-tools) a `tools.yaml` to define your tools, and then
execute `toolbox` to start the server:

<details open>
<summary>Binary</summary>

To run Toolbox from binary:

```sh
./toolbox --config "tools.yaml"
```

> ⓘ Note  
> Toolbox enables dynamic reloading by default. To disable, use the
> `--disable-reload` flag.

</details>

<details>

<summary>Container image</summary>

To run the server after pulling the [container image](#install-toolbox):

```sh
export VERSION=0.24.0 # Use the version you pulled
docker run -p 5000:5000 \
-v $(pwd)/tools.yaml:/app/tools.yaml \
us-central1-docker.pkg.dev/database-toolbox/toolbox/toolbox:$VERSION \
--config "/app/tools.yaml"
```

> ⓘ Note  
> The `-v` flag mounts your local `tools.yaml` into the container, and `-p` maps
> the container's port `5000` to your host's port `5000`.

</details>

<details>

<summary>Source</summary>

To run the server directly from source, navigate to the project root directory
and run:

```sh
go run .
```

> ⓘ Note  
> This command ru

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
