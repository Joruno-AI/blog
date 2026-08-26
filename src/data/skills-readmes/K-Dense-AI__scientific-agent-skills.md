# Scientific Agent Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)
[![Version](https://img.shields.io/badge/Version-2.64.0-blue.svg)](pyproject.toml)
[![Skills](https://img.shields.io/badge/Skills-163-brightgreen.svg)](#-whats-included)
[![Databases](https://img.shields.io/badge/Databases-100%2B-orange.svg)](#-whats-included)
[![Agent Skills](https://img.shields.io/badge/Standard-Agent_Skills-blueviolet.svg)](https://agentskills.io/)
[![Agent Plugins](https://img.shields.io/badge/Standard-Agent_Plugins-0A7A72.svg)](https://agent-plugins.org/)
[![Security Scan](https://github.com/K-Dense-AI/scientific-agent-skills/actions/workflows/security-scan.yml/badge.svg)](https://github.com/K-Dense-AI/scientific-agent-skills/actions/workflows/security-scan.yml)
[![Skill Tests](https://github.com/K-Dense-AI/scientific-agent-skills/actions/workflows/skill-tests.yml/badge.svg)](https://github.com/K-Dense-AI/scientific-agent-skills/actions/workflows/skill-tests.yml)
[![Works with](https://img.shields.io/badge/Works_with-Cursor_|_Claude_Code_|_Codex_|_Google_Antigravity-blue.svg)](#-getting-started)
[![X](https://img.shields.io/badge/Follow_on_X-%40k__dense__ai-000000?logo=x)](https://x.com/k_dense_ai)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-K--Dense_Inc.-0A66C2?logo=linkedin)](https://www.linkedin.com/company/k-dense-inc)
[![YouTube](https://img.shields.io/badge/YouTube-K--Dense_Inc.-FF0000?logo=youtube)](https://www.youtube.com/@K-Dense-Inc)
[![Reddit](https://img.shields.io/badge/Reddit-u%2F--k--dense---FF4500?logo=reddit&logoColor=white)](https://www.reddit.com/user/-k-dense-/)

> **🔔 Claude Scientific Skills is now Scientific Agent Skills.** Same skills, broader compatibility — now works with any AI agent that supports the open [Agent Skills](https://agentskills.io/) standard, not just Claude.

> **New: [K-Dense BYOK](https://github.com/K-Dense-AI/k-dense-byok)** — A free, open-source AI co-scientist that runs on your desktop, powered by Scientific Agent Skills. Bring your own API keys, pick from 40+ models, and get a full research workspace with web search, file handling, 100+ scientific databases, and access to all 161 skills in this repo. Your data stays on your computer, and you can optionally scale to cloud compute via [Modal](https://modal.com/) for heavy workloads. [Get started here.](https://github.com/K-Dense-AI/k-dense-byok)

> **🎥 Live webinar — [Getting Started with K-Dense BYOK](https://luma.com/nucztxt5)** · Tuesday, August 25, 2026 · 2:00 PM PT / 5:00 PM ET · Online, free
> Join us for a hands-on walkthrough of [K-Dense BYOK](https://github.com/K-Dense-AI/k-dense-byok), our free, open-source AI co-scientist that runs locally on your own machine and is powered by Scientific Agent Skills. We'll show you how to set it up, bring your own API keys, and run real research workflows with these skills. No prior technical experience needed, and questions are welcome throughout. **[Save your spot →](https://luma.com/nucztxt5)**

> **Stay up to date:** Follow K-Dense on [X](https://x.com/k_dense_ai), [LinkedIn](https://www.linkedin.com/company/k-dense-inc), [YouTube](https://www.youtube.com/@K-Dense-Inc), and [Reddit](https://www.reddit.com/user/-k-dense-/) for new skills, release announcements, walkthroughs, research workflow demos, and examples you can use with your own AI agent.

A comprehensive collection of **163 ready-to-use scientific and research skills** (covering cancer genomics, individual-level 1000 Genomes queries, hosted regulatory-sequence prediction, live pathogen-variant surveillance, analytical method validation, PK/PD modelling and dose selection, full-text biomedical and regulatory literature retrieval, drug-target binding, bounded biomedical knowledge graph search, molecular dynamics, RNA velocity, microbiome foundation models, geospatial science, time series forecasting, scientific ML resource discovery via Hugging Science, 78+ scientific databases, and more) for any AI agent that supports the open [Agent Skills](https://agentskills.io/) standard, created by [K-Dense](https://k-dense.ai). The repository is also a portable [Agent Plugins](https://agent-plugins.org/) package (`plugin.json` + `skills/`), so plugin-capable clients can load the whole collection as one plugin. Works with **Cursor, Claude Code, Codex, Google Antigravity, and more**. Transform your AI agent into a research assistant capable of executing complex multi-step scientific workflows across biology, chemistry, medicine, and beyond.

> ⭐ **Help make AI for science easier to discover:** If Scientific Agent Skills saves you time, teaches your agent a workflow, or helps your lab move faster, please [star this repository](https://github.com/K-Dense-AI/scientific-agent-skills). A star is a public signal that these open, reusable research skills are worth maintaining: it helps scientists, engineers, and open-source contributors find the project, shows which agent-skill standards are gaining real adoption, and gives us a clear reason to keep expanding the collection for the community.

---

These skills enable your AI agent to seamlessly work with specialized scientific libraries, databases, and tools across multiple scientific domains. While the agent can use any Python package or API on its own, these explicitly defined skills provide curated documentation and examples that make it significantly stronger and more reliable for the workflows below:
- 🧬 Bioinformatics & Genomics - Sequence analysis, single-cell RNA-seq, gene regulatory networks, variant annotation, phylogenetic analysis
- 🧪 Cheminformatics & Drug Discovery - Molecular property prediction, virtual screening, ADMET analysis, molecular docking, lead optimization
- 🔬 Proteomics & Mass Spectrometry - LC-MS/MS processing, peptide identification, spectral matching, protein quantification
- 🏥 Clinical Research & Evidence Workflows - Clinical trials, pharmacogenomics, variant evidence review, pharmacokinetic/pharmacodynamic modelling and dose-regimen evaluation, aggregate decision-support evaluation, source-bound draft report structures, and formatting of clinician-authored treatment decisions
- 🧠 Healthcare AI & Biosignal Research - EHR and model research, physiological signal analysis, and retrospective validation—not patient-specific diagnosis, treatment, alarms, or deployment decisions
- 🖼️ Medical Imaging & Digital Pathology - Privacy-aware DICOM processing and research-only whole-slide image analysis, computational pathology, and radiology data workflows
- 🤖 Machine Learning & AI - Deep learning, reinforcement learning, time series analysis, model interpretability, Bayesian methods
- 🔮 Materials Science & Chemistry - Crystal structure analysis, phase diagrams, metabolic modeling, computational chemistry
- 🌌 Physics & Astronomy - Astronomical data analysis, coordinate transformations, cosmological calculations, symbolic mathematics, physics computations
- ⚙️ Engineering & Simulation - Discrete-event simulation, multi-objective optimization, metabolic engineering, systems modeling, process optimization
- 📊 Data Analysis & Visualization - Statistical analysis, network analysis, time series, publication-quality figures, large-scale data processing, EDA
- 🌍 Geospatial Science & Remote Sensing - Satellite imagery processing, GIS analysis, spatial statistics, terrain analysis, machine learning for Earth observation
- 🧪 Laboratory Automation - Liquid handling protocols, lab equipment control, workflow automation, LIMS integration
- 📚 Scientific Communication - Evidence-traceable writing, confidential authorized peer review, literature synthesis, document processing, macro-free PPTX posters, slides, schematics, and citation management
- 🔬 Multi-omics & Systems Biology - Multi-modal data integration, pathway analysis, network biology, systems-level insights
- 🧬 Protein Engineering & Design - Protein language models, structure prediction, sequence design, function annotation
- 🧰 Agent Platforms & Infrastructure - Build on Pi with SDK, RPC, extensions, custom providers/models, packages, TUI components, and session tooling
- 🎓 Research Methodology - Evidence-bounded candidate hypotheses, scientific brainstorming, critical thinking, grant writing, and qualitative low-stakes evaluation of scholarly works
- ⚖️ Regulatory & Standards - Draft evidence-preparation artifacts for ISO management-system and laboratory standards, plus analytical method validation, verification, and transfer under ICH/USP/CLSI frameworks—prepared for qualified review, never a certification, accreditation, or method-release decision

**Transform your AI coding agent into an 'AI Scientist' on your desktop!**

> 🎬 **New to Scientific Agent Skills?** Watch our [Getting Started with Scientific Agent Skills](https://youtu.be/ZxbnDaD_FVg) video for a quick walkthrough.

### 🎥 More tutorials

Recorded walkthroughs of these skills on real research tasks, from the [K-Dense YouTube channel](https://www.youtube.com/@K-Dense-Inc):

| Video | What it covers |
|-------|----------------|
| [Skills 101: Build Your Own Scientific Agent Skill](https://youtu.be/lVZbHiwzMEg) | Writing, testing, and packaging a new skill from scratch |
| [Literature Review and Hypothesis Generation](https://youtu.be/wKJp8y4ZyiM) | Searching the literature and generating grounded hypotheses |
| [Draft and Budget an Experimental Protocol](https://youtu.be/Yz2L5s_M_34) | Turning a planned experiment into a costed, written protocol |
| [Draft Responses to Reviewer Comments](https://youtu.be/0MmU-Pmtg1o) | Building a point-by-point rebuttal from reviewer feedback |
| [Can AI Reproduce a Nature Medicine Paper?](https://youtu.be/4WTCK9kSfdk) | An end-to-end reproduction attempt on a published analysis |

---

## 📦 What's Included

This repository provides **163 scientific and research skills** organized into the following categories:

- **100+ Scientific & Financial Databases** - A unified database-lookup skill provides deterministic, provenance-rich access to 78 public databases (PubChem, ChEMBL, UniProt, COSMIC, ClinicalTrials.gov, FRED, USPTO, and more), plus dedicated skills for DepMap, Imaging Data Commons, PrimeKG, NCATS ARAX, U.S. Treasury Fiscal Data, Hugging Science, OneKGPd, and Genomic Intelligence. Multi-database packages like BioServices (~40 bioinformatics services), BioPython (39 NCBI sub-databases via Entrez), and gget (20+ genomics databases) add further coverage
- **70+ Optimized Python Package Skills** - Explicitly defined, version-aware workflows for RDKit, Scanpy, PyTorch Lightning, scikit-learn, PyTDC, PathML, pydicom, NeuroKit2, PufferLib, QuTiP, GeoPandas, pymatgen, BioPython, Qiskit, Molecular Dynamics (OpenMM/MDAnalysis), and others. The agent can still use *any* Python package; these skills provide stronger, safer guidance for the packages listed
- **9 Scientific Integration Skills** - Explicitly defined skills for Benchling, DNAnexus, LatchBio, OMERO, Protocols.io, Open Notebook, Ginkgo Cloud Lab, LabArchives, and Opentrons. Again, the agent is not limited to these — any API or platform reachable from Python is fair game; these skills are the optimized, pre-documented paths
- **30+ Analysis & Communication Tools** - Literature review, evidence-traceable scientific writing, confidential peer review, document processing, Paperclip (full-text papers, FDA/PMDA/EMA filings, and trial registries with line-pinned citations), Paperzilla, Exa Search, macro-free PPTX posters, slides, schematics, infographics, Mermaid diagrams, and more
- **10+ Research & Clinical Tools** - Evidence-bounded hypothesis generation, grant writing, aggregate clinical decision-support research, clinician-authored treatment-plan formatting, PK/PD modelling and simulation (NCA, population PK, exposure-response, bioequivalence, first-in-human dose), BIDS, ISO standards-readiness evidence preparation (ISO 13485, ISO 14971, ISO/IEC 17025, ISO 15189), analytical method validation and transfer (ICH Q2(R2)/Q14, ICH M10, USP, CLSI EP), scenario analysis, and workflow-derived skill drafting with Autoskill

Each skill includes:
- ✅ Comprehensive documentation (`SKILL.md`)
- ✅ Practical code examples
- ✅ Use cases and best practices
- ✅ Integration guides
- ✅ Reference materials
- ✅ A test suite for every skill that ships `scripts/` — CI blocks a pull request that adds bundled tooling without one

---

## 📋 Table of Contents

- [What's Included](#-whats-included)
- [Why Use This?](#-why-use-this)
- [Getting Started](#-getting-started)
- [Security Disclaimer](#%EF%B8%8F-security-disclaimer)
- [Support Open Source](#%EF%B8%8F-support-the-open-source-community)
- [Prerequisites](#%EF%B8%8F-prerequisites)
- [Quick Examples](#-quick-examples)
- [Use Cases](#-use-cases)
- [Available Skills](#-available-skills)
- [From the Blog](#-from-the-blog)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)
- [FAQ](#-faq)
- [Support](#-support)
- [Citation](#-citation)
- [License](#-license)

---

## 🚀 Why Use This?

### ⚡ **Accelerate Your Research**
- **Save Days of Work** - Skip API documentation research and integration setup
- **Reviewed Starting Points** - Tested examples with explicit validation, provenance, and safety boundaries; verify them in the target environment
- **Multi-Step Workflows** - Execute complex pipelines with a single prompt

### 🎯 **Comprehensive Coverage**
- **161 Skills** - Extensive coverage across all major scientific domains
- **100+ Databases** - Unified access to 78+ databases via database-lookup, plus dedicated data access skills and multi-database packages like BioServices, BioPython, and gget
- **70+ Optimized Python Package Skills** - Current, version-scoped guidance for packages including RDKit, Scanpy, PyTorch Lightning, scikit-learn, PyTDC, pydicom, PufferLib, QuTiP, GeoPandas, pymatgen, Qiskit, Molecular Dynamics (OpenMM/MDAnalysis), scVelo, and TimesFM (the agent can use any Python package; these are the pre-documented paths)

### 🔧 **Easy Integration**
- **Simple Setup** - Copy skills to your skills directory and start working
- **Configured Discovery** - Compatible hosts can find and use relevant skills from their configured skill paths
- **Well Documented** - Each skill includes examples, use cases, and best practices

### 🌟 **Maintained & Supported**
- **Regular Updates** - Continuously maintained and expanded by K-Dense team
- **Tested in CI** - Every skill that ships `scripts/` has a suite under `tests/`, plus a repo-wide structural contract (frontmatter, link resolution, script parsing, `--help` behavior) that runs on every pull request
- **Community Driven** - Open source with active community contributions
- **Enterprise Ready** - Commercial support available for advanced needs

---

## 🎯 Getting Started

### Option 1: npx (supported hosts)

Install Scientific Agent Skills with a single command:

```bash
npx skills add K-Dense-AI/scientific-agent

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
