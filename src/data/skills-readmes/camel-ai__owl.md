<div align="center">

</div>

<h1 align="center">
	🦉 OWL: Optimized Workforce Learning for General Multi-Agent Assistance in Real-World Task Automation
</h1>

<div align="center">

[![Documentation][docs-image]][docs-url]
[![Discord][discord-image]][discord-url]
[![X][x-image]][x-url]
[![Reddit][reddit-image]][reddit-url]
[![Wechat][wechat-image]][wechat-url]
[![Wechat][owl-image]][owl-url]
[![Hugging Face][huggingface-image]][huggingface-url]
[![Star][star-image]][star-url]
[![Package License][package-license-image]][package-license-url]
[![Citation](https://img.shields.io/badge/Citation-arXiv%3A2505.23885-purple)](https://arxiv.org/abs/2505.23885)

</div>

<hr>

<div align="center">
<h4 align="center">

[中文阅读](https://github.com/camel-ai/owl/tree/main/README_zh.md) |
[Community](https://github.com/camel-ai/owl#community) |
[Installation](#️-installation) |
[Examples](https://github.com/camel-ai/owl/tree/main/owl) |
[Paper](https://arxiv.org/abs/2505.23885) |
[Citation](https://github.com/camel-ai/owl#citation) |
[Contributing](https://github.com/camel-ai/owl/graphs/contributors) |
[CAMEL-AI](https://www.camel-ai.org/) |

</h4>

<div align="center" style="background-color: #f0f7ff; padding: 10px; border-radius: 5px; margin: 15px 0;">
  <h3 style="color: #1e88e5; margin: 0;">
    🏆 OWL achieves <span style="color: #d81b60; font-weight: bold; font-size: 1.2em;">69.09</span> average score on GAIA benchmark and ranks <span style="color: #d81b60; font-weight: bold; font-size: 1.2em;">🏅️ #1</span> among open-source frameworks! 🏆
  </h3>
</div>

<div align="center">

🦉 OWL is a cutting-edge framework for multi-agent collaboration that pushes the boundaries of task automation, built on top of the [CAMEL-AI Framework](https://github.com/camel-ai/camel).

Our vision is to revolutionize how AI agents collaborate to solve real-world tasks. By leveraging dynamic agent interactions, OWL enables more natural, efficient, and robust task automation across diverse domains.

If you find this repo useful, please consider citing our work ([citation](#-cite)).
</div>

![](./assets/owl_architecture.png)

<br>

</div>

<!-- # Key Features -->

# 📋 Table of Contents

- [📋 Table of Contents](#-table-of-contents)
- [🔥 News](#-news)
- [🎬 Demo Video](#-demo-video)
- [✨️ Core Features](#️-core-features)
- [🛠️ Installation](#️-installation)
  - [**Prerequisites**](#prerequisites)
    - [Install Python](#install-python)
  - [**Installation Options**](#installation-options)
    - [Option 1: Using uv (Recommended)](#option-1-using-uv-recommended)
    - [Option 2: Using venv and pip](#option-2-using-venv-and-pip)
    - [Option 3: Using conda](#option-3-using-conda)
    - [Option 4: Using Docker](#option-4-using-docker)
      - [**Using Pre-built Image (Recommended)**](#using-pre-built-image-recommended)
      - [**Building Image Locally**](#building-image-locally)
      - [**Using Convenience Scripts**](#using-convenience-scripts)
  - [**Setup Environment Variables**](#setup-environment-variables)
    - [Setting Environment Variables Directly](#setting-environment-variables-directly)
    - [Alternative: Using a `.env` File](#alternative-using-a-env-file)
    - [**MCP Desktop Commander Setup**](#mcp-desktop-commander-setup)
- [🚀 Quick Start](#-quick-start)
  - [Basic Usage](#basic-usage)
  - [Running with Different Models](#running-with-different-models)
    - [Model Requirements](#model-requirements)
      - [Supported Models](#supported-models)
    - [Example Tasks](#example-tasks)
- [🧰 Toolkits and Capabilities](#-toolkits-and-capabilities)
  - [Model Context Protocol (MCP)](#model-context-protocol-mcp)
    - [**Install Node.js**](#install-nodejs)
    - [Windows](#windows)
    - [Linux](#linux)
    - [Mac](#mac)
    - [**Install Playwright MCP Service**](#install-playwright-mcp-service)
  - [Available Toolkits](#available-toolkits)
  - [Available Toolkits](#available-toolkits-1)
    - [Multimodal Toolkits (Require multimodal model capabilities)](#multimodal-toolkits-require-multimodal-model-capabilities)
    - [Text-Based Toolkits](#text-based-toolkits)
  - [Customizing Your Configuration](#customizing-your-configuration)
- [🌐 Web Interface](#-web-interface)
  - [Starting the Web UI](#starting-the-web-ui)
  - [Features](#features)
- [🧪 Experiments](#-experiments)
- [📄 License](#-license)
- [🤝 Contributing](#-contributing)
- [🔥 Community](#-community)
- [❓ FAQ](#-faq)
  - [General Questions](#general-questions)
  - [Experiment Questions](#experiment-questions)
- [📚 Exploring CAMEL Dependency](#-exploring-camel-dependency)
  - [Accessing CAMEL Source Code](#accessing-camel-source-code)
- [🖊️ Cite](#️-cite)
- [⭐ Star History](#-star-history)

# 🔥 News

<div align="center" style="background-color: #e8f5e9; padding: 15px; border-radius: 10px; border: 2px solid #4caf50; margin: 20px 0;">
  <h3 style="color: #2e7d32; margin: 0; font-size: 1.3em;">
    🧩 <b>NEW: COMMUNITY AGENT CHALLENGES!</b> 🧩
  </h3>
  <p style="font-size: 1.1em; margin: 10px 0;">
    Showcase your creativity by designing unique challenges for AI agents! <br>
    Join our community and see your innovative ideas tackled by cutting-edge AI.
  </p>
  <p>
    <a href="https://github.com/camel-ai/owl/blob/main/community_challenges.md" style="background-color: #2e7d32; color: white; padding: 8px 15px; text-decoration: none; border-radius: 5px; font-weight: bold;">View & Submit Challenges</a>
  </p>
</div>

<!-- <div style="background-color: #e3f2fd; padding: 12px; border-radius: 8px; border-left: 4px solid #1e88e5; margin: 10px 0;">
  <h4 style="color: #1e88e5; margin: 0 0 8px 0;">
    🎉 Latest Major Update - March 15, 2025
  </h4>
  <p style="margin: 0;">
    <b>Significant Improvements:</b>
    <ul style="margin: 5px 0 0 0; padding-left: 20px;">
      <li>Restructured web-based UI architecture for enhanced stability 🏗️</li>
      <li>Optimized OWL Agent execution mechanisms for better performance 🚀</li>
    </ul>
    <i>Try it now and experience the improved performance in your automation tasks!</i>
  </p>
</div> -->

- **[2025.09.22]**: Exicited to announce that OWL has been accepted by NeurIPS 2025!🚀 Check the latest paper [here](https://arxiv.org/abs/2505.23885).
- **[2025.07.21]**: We open-sourced the training dataset and model checkpoints of OWL project. Training code coming soon. [huggingface link](https://huggingface.co/collections/camel-ai/optimized-workforce-learning-682ef4ab498befb9426e6e27).
- **[2025.05.27]**: We released the technical report of OWL, including more details on the workforce (framework) and optimized workforce learning (training methodology). [paper](https://arxiv.org/abs/2505.23885).
- **[2025.05.18]**: We open-sourced an initial version for replicating workforce experiment on GAIA [here](https://github.com/camel-ai/owl/tree/gaia69).
- **[2025.04.18]**: We uploaded OWL's new GAIA benchmark score of **69.09%**, ranking #1 among open-source frameworks. Check the technical report [here](https://hypnotic-mind-6bd.notion.site/OWL-Optimized-Workforce-Learning-for-General-Multi-Agent-Assistance-in-Real-World-Task-Automation-1d4004aeb21380158749c7f84b20643f).
- **[2025.03.27]**: Integrate SearxNGToolkit performing web searches using SearxNG search engine.
- **[2025.03.26]**: Enhanced Browser Toolkit with multi-browser support for "chrome", "msedge", and "chromium" channels.
- **[2025.03.25]**: Supported Gemini 2.5 Pro, added example run code
- **[2025.03.21]**: Integrated OpenRouter model platform, fix bug with Gemini tool calling.
- **[2025.03.20]**: Accept header in MCP Toolkit, support automatic playwright installation.
- **[2025.03.16]**: Support Bing search, Baidu search.
- **[2025.03.12]**: Added Bocha search in SearchToolkit, integrated Volcano Engine model platform, and enhanced Azure and OpenAI Compatible models with structured output and tool calling.
- **[2025.03.11]**: We added MCPToolkit, FileWriteToolkit, and TerminalToolkit to enhance OWL agents with MCP tool calling, file writing capabilities, and terminal command execution.
- **[2025.03.09]**: We added a web-based user interface that makes it easier to interact with the system.
- **[2025.03.07]**: We open-sourced the codebase of the 🦉 OWL project.
- **[2025.03.03]**: OWL achieved the #1 position among open-source frameworks on the GAIA benchmark with a score of 58.18.

# 🎬 Demo Video

https://github.com/user-attachments/assets/2a2a825d-39ea-45c5-9ba1-f9d58efbc372

https://private-user-images.githubusercontent.com/55657767/420212194-e813fc05-136a-485f-8df3-f10d9b4e63ec.mp4

This video demonstrates how to install OWL locally and showcases its capabilities as a cutting-edge framework for multi-agent collaboration: https://www.youtube.com/watch?v=8XlqVyAZOr8

# ✨️ Core Features

- **Online Search**: Support for multiple search engines (including Wikipedia, Google, DuckDuckGo, Baidu, Bocha, etc.) for real-time information retrieval and knowledge acquisition.
- **Multimodal Processing**: Support for handling internet or local videos, images, and audio data.
- **Browser Automation**: Utilize the Playwright framework for simulating browser interactions, including scrolling, clicking, input handling, downloading, navigation, and more.
- **Document Parsing**: Extract content from Word, Excel, PDF, and PowerPoint files, converting them into text or Markdown format.
- **Code Execution**: Write and execute Python code using interpreter.
- **Built-in Toolkits**: Access to a comprehensive set of built-in toolkits including:
  - **Model Context Protocol (MCP)**: A universal protocol layer that standardizes AI model interactions with various tools and data sources
  - **Core Toolkits**: ArxivToolkit, AudioAnalysisToolkit, CodeExecutionToolkit, DalleToolkit, DataCommonsToolkit, ExcelToolkit, GitHubToolkit, GoogleMapsToolkit, GoogleScholarToolkit, ImageAnalysisToolkit, MathToolkit, NetworkXToolkit, NotionToolkit, OpenAPIToolkit, RedditToolkit, SearchToolkit, SemanticScholarToolkit, SymPyToolkit, VideoAnalysisToolkit, WeatherToolkit, BrowserToolkit, and many more for specialized tasks

# 🛠️ Installation

## **Prerequisites**

### Install Python

Before installing OWL, ensure you have Python installed (version 3.10, 3.11, or 3.12 is supported):

> **Note for GAIA Benchmark Users**: When running the GAIA benchmark evaluation, please use the `gaia58.18` branch which includes a customized version of the CAMEL framework in the `owl/camel` directory. This version contains enhanced toolkits with improved stability specifically optimized for the GAIA benchmark compared to the standard CAMEL installation.

```bash
# Check if Python is installed
python --version

# If not installed, download and install from https://www.python.org/downloads/
# For macOS users with Homebrew:
brew install python@3.10

# For Ubuntu/Debian:
sudo apt update
sudo apt install python3.10 python3.10-venv python3-pip
```

## **Installation Options**

OWL supports multiple installation methods to fit your workflow preferences.

### Option 1: Using uv (Recommended)

```bash
# Clone github repo
git clone https://github.com/camel-ai/owl.git

# Change directory into project directory
cd owl

# Install uv if you don't have it already
pip install uv

# Create a virtual environment and install dependencies
uv venv .venv --python=3.10

# Activate the virtual environment
# For macOS/Linux
source .venv/bin/activate
# For Windows
.venv\Scripts\activate

# Install CAMEL with all dependencies
uv pip install -e .
```

### Option 2: Using venv and pip

```bash
# Clone github repo
git clone https://github.com/camel-ai/owl.git

# Change directory into project directory
cd owl

# Create a virtual environment
# For Python 3.10 (also works with 3.11, 3.12)
python3.10 -m venv .venv

# Activate the virtual environment
# For macOS/Linux
source .venv/bin/activate
# For Windows
.venv\Scripts\activate

# Install from requirements.txt
pip install -r requirements.txt --use-pep517
```

### Option 3: Using conda

```bash
# Clone github repo
git clone https://github.com/camel-ai/owl.git

# Change directory into project directory
cd owl

# Create a conda environment
conda create -n owl python=3.10

# Activate the conda environment
conda activate owl

# Option 1: Install as a package (recommended)
pip install -e .

# Option 2: Install from requirements.txt
pip install -r requirements.txt --use-pep517
```

### Option 4: Using Docker

#### **Using Pre-built Image (Recommended)**

```bash
# This option downloads a ready-to-use image from Docker Hub
# Fastest and recommended for most users
docker compose up -d

# Run OWL inside the container
docker compose exec owl bash
cd .. && source .venv/bin/activate
playwright install-deps
xvfb-python examples/run.py
```

#### **Building Image Locally**

```bash
# For users who need to customize the Docker image or cannot access Docker Hub:
# 1. Open docker-compose.yml
# 2. Comment out the "image: mugglejinx/owl:latest" line
# 3. Uncomment the "build:" section and its nested properties
# 4. Then run:
docker compose up -d --build

# Run OWL inside the container
docker compose exec owl bash
cd .. && source .venv/bin/activate
playwright install-deps
xvfb-python examples/run.py
```

#### **Using Convenience Scripts**

```bash
# Navigate to container directory
cd .container

# Make the script executable and build the Docker image
chmod +x build_docker.sh
./build_docker.sh

# Run OWL with your question
./run_in_docker.sh "your question"
```

## **Setup Environment Variables**

OWL requires various API keys to interact with different services.

### Setting Environment Variables Directly

You can set environment variables directly in your terminal:

- **macOS/Linux (Bash/Zsh)**:

  ```bash
  export OPENAI_API_KEY="your-openai-api-key-here"
  # Add other required API keys as needed
  ```

- **Windows (Command Prompt)**:

  ```batch
  set OPENAI_API_KEY=your-openai-api-key-here
  ```

- **Windows (PowerShell)**:
  ```powershell
  $env:OPENAI_API_KEY = "your-openai-api-key-here"
  ```

> **Note**: Environment variables set directly in the terminal will only persist for the current session.

### Alternative: Using a `.env` File

If you prefer using a `.env` file instead, you can:

1. **Copy and Rename the Template**:

   ```bash
   # For macOS/Linux
   cd owl
   cp .env_template .env

   # For Windows
   cd owl
   copy .env_template .env
   ```

   Alternatively, you can manually create a new file named `.env` in the owl directory and copy the contents from `.env_template`.

2. **Configure Your API Keys**:
   Open the `.env` file in your preferred text editor and insert your API keys in the corresponding fields.

> **Note**: For the minimal example (`examples/run_mini.py`), you only need to configure the LLM API key (e.g., `OPENAI_API_KEY`).

### **MCP Desktop Commander Setup**

If using MCP Desktop Commander within Docker, run:

```bash
npx -y @wonderwhy-er/desktop-commander setup --force-file-protocol
```

For more detailed Docker usa

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
