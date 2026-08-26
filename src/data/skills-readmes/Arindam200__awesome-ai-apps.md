![Banner](/assets/awesome_banner.png)

<div align="center">

# Awesome AI Apps [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

<a href="https://trendshift.io/repositories/14662" target="_blank"><img src="https://trendshift.io/api/badge/repositories/14662" alt="Arindam200%2Fawesome-ai-apps | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>

</div>

This repository is a comprehensive collection of **131 committed projects**, tutorials, and recipes for building powerful LLM-powered applications, including text agents, voice assistants, RAG apps, and MCP-backed tools. These projects serve as a guide for developers working with various AI frameworks and stacks.

## 📋 Table of Contents

- [🚀 Featured AI Apps](#-featured-ai-apps)
  - [🧩 Starter Agents](#-starter-agents)
  - [🪶 Simple Agents](#-simple-agents)
  - [🎙️ Voice Agents](#-voice-agents)
  - [🗂️ MCP Agents](#️-mcp-agents)
  - [🧠 Memory Agents](#-memory-agents)
  - [📚 RAG Applications](#-rag-applications)
  - [🔬 Advanced Agents](#-advanced-agents)
  - [🧬 Fine-Tuning](#-fine-tuning)
- [📺 Tutorials & Videos](#-tutorials--videos)
- [🚀 Getting Started](#getting-started)
- [🤝 Contributing](#-contributing)

---

<div align="center">

## 💎 Sponsors

<p align="center">
  A huge thank you to our sponsors for their generous support!
</p>

<table align="center" cellpadding="10" style="width:100%; border-collapse:collapse;">
  <tr align="center">
    <td width="300" valign="middle" align="center">
      <a href="https://dub.sh/brightdata" target="_blank" title="Visit Bright Data">
        <img src="https://upload.wikimedia.org/wikipedia/commons/7/74/Bright_Data.svg" height="35" style="max-width:180px;" alt="Bright Data - Web Data Platform">
      </a>
      <br>
      <sub>
        <span style="white-space:nowrap;">Web Data Platform</span>
        <br>
        <a href="https://dub.sh/brightdata" target="_blank">
          <img src="https://img.shields.io/badge/Visit%20Site-blue?style=flat-square" alt="Visit Bright Data website">
        </a>
      </sub>
    </td>
    <td width="300" valign="middle" align="center">
      <a href="https://dub.sh/nebius" target="_blank" title="Visit Nebius Token Factory">
        <img src="./assets/nebius.png" height="36" style="max-width:180px;" alt="Nebius Token Factory">
      </a>
      <br>
      <sub>
        <span style="white-space:nowrap;">AI Inference Provider</span>
        <br>
        <a href="https://dub.sh/nebius" target="_blank">
          <img src="https://img.shields.io/badge/Visit%20Site-blue?style=flat-square" alt="Visit Nebius Token Factory">
        </a>
      </sub>
    </td>
    <td width="300" valign="middle" align="center">
      <a href="https://dub.sh/scrapegraphai" target="_blank" title="Visit ScrapeGraphAI on GitHub">
        <img src="https://raw.githubusercontent.com/ScrapeGraphAI/ScrapeGraph-AI/main/docs/assets/scrapegraphai_logo.png" height="44" style="max-width:180px;" alt="ScrapeGraphAI - Web Scraping Library">
      </a>
      <br>
      <sub>
        <span style="white-space:nowrap;">AI Web Scraping framework</span>
        <br>
        <a href="https://dub.sh/scrapegraphai" target="_blank">
          <img src="https://img.shields.io/badge/Visit%20Site-blue?style=flat-square" alt="View ScrapeGraphAI on GitHub">
        </a>
      </sub>
    </td>
  </tr>
  <tr align="center">
    <td width="300" valign="middle" align="center">
      <a href="https://dub.sh/memorilabs" target="_blank" title="Visit Memorilabs">
        <img src="assets/memori.png" height="36" style="max-width:180px;" alt="Memori - SQL Native Memory for AI">
      </a>
      <br>
      <sub>
        <span style="white-space:nowrap;">SQL Native Memory for AI</span>
        <br>
        <a href="https://dub.sh/memorilabs" target="_blank">
          <img src="https://img.shields.io/badge/Visit%20Site-blue?style=flat-square" alt="Visit Memorilabs website">
        </a>
      </sub>
    </td>
    <td width="300" valign="middle" align="center">
      <a href="https://dub.sh/copilotkit" target="_blank" title="Visit CopilotKit">
        <img src="assets/copilot-kit-logo.svg" height="36" style="max-width:180px;" alt="CopilotKit - Agentic Application Platform">
      </a>
      <br>
      <sub>
        <span style="white-space:nowrap;">Agentic Application Platform</span>
        <br>
        <a href="https://dub.sh/copilotkit" target="_blank">
          <img src="https://img.shields.io/badge/Visit%20Site-blue?style=flat-square" alt="Visit CopilotKit website">
        </a>
      </sub>
    </td>
    <td width="300" valign="middle" align="center">
      <a href="https://dub.sh/scalekitt" target="_blank" title="Visit ScaleKit">
        <img src="assets/scalekit.svg" height="36" style="max-width:180px;" alt="ScaleKit - Auth Stack for AI">
      </a>
      <br>
      <sub>
        <span style="white-space:nowrap;">Auth Stack for AI</span>
        <br>
        <a href="https://dub.sh/scalekitt" target="_blank">
          <img src="https://img.shields.io/badge/Visit%20Site-blue?style=flat-square" alt="Visit ScaleKit website">
        </a>
      </sub>
    </td>
  </tr>
  <tr align="center">
    <td width="200" valign="middle" align="center">
      <a href="https://okahu.ai" target="_blank" title="Visit Okahu">
        <img src="assets/okahu.png" height="36" style="max-width:180px;" alt="Okahu - AI Platform">
      </a>
      <br>
      <sub>
        <span style="white-space:nowrap;">AI Observability Platform</span>
        <br>
        <a href="https://okahu.ai" target="_blank">
          <img src="https://img.shields.io/badge/Visit%20Site-blue?style=flat-square" alt="Visit Okahu website">
        </a>
      </sub>
    </td>
    <td width="200" valign="middle" align="center">
      <a href="https://dub.sh/agentfield" target="_blank" title="Visit AgentField">
        <img src="assets/agentfield.png" height="40" style="max-width:180px;" alt="AgentField - Kubernetes for AI Agents">
      </a>
      <br>
      <sub>
        <span style="white-space:nowrap;">Kubernetes for AI Agents</span>
        <br>
        <a href="https://dub.sh/agentfield" target="_blank">
          <img src="https://img.shields.io/badge/Visit%20Site-blue?style=flat-square" alt="Visit AgentField website">
        </a>
      </sub>
    </td>
  </tr>

</table>

### 💎 Become a Sponsor

<p align="center">
Interested in sponsoring this project? Feel free to reach out!
<br/>
<a href="mailto:contact@studio1hq.com">
    <img src="https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Email">
</a>
</p>

</div>

---

## 🚀 Featured AI Apps

### 🧩 Starter Agents

**Quick-start agents for learning and extending different AI frameworks.** _20 projects_

- [AutoGen Tool-Calling Starter](starter_ai_agents/autogen_starter): Microsoft AutoGen `AssistantAgent` with a custom tool, powered by Nebius Token Factory
- [AWS Strands Agent Starter](starter_ai_agents/aws_strands_starter): Weather report agent using AWS Strands SDK
- [CAMEL AI Model Benchmark](starter_ai_agents/camel_ai_starter): Performance benchmarking tool comparing various AI models
- [CrewAI Research Crew](starter_ai_agents/crewai_starter): Multi-agent research team example
- [Docker cagent Multi-Agent Starter](starter_ai_agents/cagent_starter): Open-source customizable multi-agent runtime by Docker
- [DSPy Optimization Starter](starter_ai_agents/dspy_starter): DSPy framework for building and optimizing AI systems
- [Google Agent Development Kit Starter](starter_ai_agents/google_adk_starter): Google Agent Development Kit starter template
- [Hacker News Trend Analyst (Agno)](starter_ai_agents/agno_starter): Agno-based agent for trend analysis on Hacker News
- [Hugging Face smolagents Starter](starter_ai_agents/smolagents_starter): Hugging Face smolagents code-first web-search agent
- [KAOS Kubernetes Multi-Agent Starter](starter_ai_agents/kaos_starter): Kubernetes-native multi-agent system with MCP tools and in-cluster LLM
- [LangChain Tool-Calling Starter](starter_ai_agents/langchain_starter): LangChain tool-calling agent with `create_tool_calling_agent` + `AgentExecutor`, powered by Nebius
- [LangGraph ReAct Agent Starter](starter_ai_agents/langgraph_starter): LangGraph prebuilt ReAct agent (`create_react_agent`) with custom tools, powered by Nebius
- [Letta Stateful Memory Agent](starter_ai_agents/letta_starter): Stateful agent with persistent long-term memory across sessions
- [LlamaIndex Task Manager](starter_ai_agents/llamaindex_starter): LlamaIndex-powered task assistant
- [Mastra Tool-Calling Starter](starter_ai_agents/mastra_starter): TypeScript-first agent with a custom tool powered by Nebius Token Factory
- [Microsoft Agent Framework Starter](starter_ai_agents/microsoft_agents_starter): Multi-agent travel planning demos built on Microsoft Agent Framework
- [OpenAI Agents SDK Starter](starter_ai_agents/openai_agents_sdk): OpenAI Agents SDK with email helper and haiku writer examples
- [PydanticAI Weather Bot](starter_ai_agents/pydantic_starter): Real-time weather information agent
- [Sayna Realtime Voice Agent](starter_ai_agents/sayna_starter): Real-time voice infrastructure with multi-provider STT/TTS (Deepgram, ElevenLabs, Azure, Google) and WebSocket streaming
- [Semantic Kernel Starter](starter_ai_agents/semantic_kernel_starter): Microsoft Semantic Kernel `ChatCompletionAgent` with plugin-based tool calling

### 🪶 Simple Agents

**Straightforward, practical use-cases for everyday AI applications.** _18 projects_

- [Agno Agent Examples](simple_ai_agents/agno_ai_examples): Simple to multi-agent examples with web search and a knowledge base
- [Agno Agent UI](simple_ai_agents/agno_ui_agent): Interactive UI for web and finance agents
- [AI Agent Registry Explorer](simple_ai_agents/agent_discovery_agent): Find and compare AI agents across NANDA, MCP, Virtuals, A2A, and ERC-8004 registries
- [Calendar Assistant](simple_ai_agents/cal_scheduling_agent): Calendar scheduling integration with Cal.com
- [Cost-Aware Model Router (RouteLLM)](simple_ai_agents/llm_router): Intelligent model routing with RouteLLM (GPT-4o-mini vs Nebius Llama) for cost optimization
- [Email-to-Calendar Assistant](simple_ai_agents/email_to_calendar_scheduler): AI-powered Gmail reader and Google Calendar manager
- [Financial Reasoning Agent](simple_ai_agents/reasoning_agent): Step-by-step financial reasoning demonstration
- [Human-in-the-Loop Agent](simple_ai_agents/human_in_the_loop_agent): HITL actions for safe AI task execution
- [LangChain Operations Agent Collection](simple_ai_agents/langchain_simple_agents): Nebius-powered incident response, support, vendor risk, and data quality agents with typed outputs and guarded tools
- [Mastra Weather Bot](simple_ai_agents/mastra_ai_weather_agent): Weather updates using Mastra AI framework
- [Natural-Language Database Assistant](simple_ai_agents/talk_to_db): Natural language database queries with GibsonAI and LangChain
- [Natural-Language SQL Agent (LangChain)](simple_ai_agents/langchain_data_agent_poc): Natural-language-to-SQL data agent with LangGraph, Nebius, read-only SQL safety, and Streamlit charts
- [Nebius Chat](simple_ai_agents/nebius_chat): Chat interface for Nebius Token Factory
- [Newsletter Generator](simple_ai_agents/newsletter_agent): AI-powered newsletter builder with Firecrawl integration
- [Stock Market Finance Agent](simple_ai_agents/finance_agent): Real-time stock and market data tracking agent
- [Stock Portfolio Analyst](simple_ai_agents/stock_portfolio_analyst): Live portfolio valuation, concentration analysis, risk flags, and rebalancing ideas with Agno
- [VoyageCompass Travel Planner](simple_ai_agents/nebius_travel_planner): LangChain and Nebius travel planner with weather, research, currency conversion, budgets, and packing tools
- [Web Automation Agent](simple_ai_agents/browser_agent): Browser automation agent using Nebius and browser-use

### 🎙️ Voice Agents

**Real-time voice assistants and streaming speech pipelines.** _9 projects_

- [AI Pitch Coach (Gradium + Nebius)](voice_agents/voice-agent-gradium-nebius-langchain): Conversational pitch coach using Gradium STT/TTS, LangChain orchestration, and Nebius reasoning
- [Customer Support Voice Agent (LiveKit)](voice_agents/customer_support_agent): Nebius-powered voice support agent with context-preserving AI manager handoff, noise cancellation, and inactivity handling
- [Gemini Realtime Voice Agent (LiveKit)](voice_agents/livekit_gemini_agents): LiveKit Agents with Google Gemini Live (`gemini` multimodal realtime) for low-latency voice conversations in a LiveKit room
- [Healthcare Voice Contact Center](voice_agents/healthcare_contact_center): Pipecat healthcare contact center with appointment booking, FAQ handling, and supervisor escalation
- [Multilingual Voice Agent (Pipecat + Sarvam)](voice_agents/pipecat_agent): Pipecat voice pipeline with Sarvam STT/TTS and OpenAI for chat; WebRTC (browser) or Daily transport via the Pipecat runner
- [RSVP Confirmation Voice Agent (LiveKit)](voice_agents/livekit_rsvp_agent): Outbound voice agent that calls attendees, confirms RSVPs, and updates a JSON-backed event database
- [Speed-to-Lead Sales Voice Agent](voice_agents/speed_to_lead_agent): LiveKit-based voice agent that calls inbound leads instantly, routes them to specialists, and logs to a mock CRM
- [Voice-Powered Codebase Assistant (VoxCode)](voice_agents/Cursor_code_editor): Local voice workspace for codebase summaries and architecture Q&A; Deepgram Voice Agent + Nebius reasoning + Cursor SDK file inspection and edits
- [Web-Search Voice Agent (LiveKit)](voice_agents/livekit_web_search_agent): LiveKit + Gemini realtime voice agent with an Olostep-backed `web_search` tool for fresh, source-cited answers

### 🗂️ MCP Agents

**Examples using Model Context Protocol for external tool integration.** _14 projects_

- [Couchbase LangGraph MCP Agent](mcp_ai_agents/langchain_langgraph_mcp_agent): LangChain ReAct agent with Couchbase integration
- [Couchbase MCP Server](mcp_ai_agents/couchbase_mcp_server): Couchbase database integration with MCP protocol
- [Custom MCP Server Starter](mcp_ai_agents/custom_mcp_server): Custom MCP server implementation example
- [Documentation Q&A MCP Agent](mcp_ai_agents/docs_qna_agent): Documentation Q&A agent with MCP
- [Documentation RAG MCP Server](mcp_ai_agents/doc_mcp): Semantic RAG documentation and Q&A system
- [GibsonAI Database MCP Agent](mcp_ai_agents/database_mcp_agent): Conversational AI agent for managing GibsonAI database projects and schemas
- [GitHub MCP Agent](mcp_ai_agents/github_mcp_agent): Repository insights and analysis via MCP
- [GitHub MCP Agent Starter](mcp_ai_agents/mcp_starter): GitHub repository analyzer starter template
- [Hotel Finder Agent](mcp_ai_agents/hotel_finder_agent): Hotel search and booking using MCP integration
- [Sandboxed Code Execution MCP Agent (Docker + E2B)](mcp_ai_agents/e2b_docker

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
