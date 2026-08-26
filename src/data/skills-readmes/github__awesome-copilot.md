# 🤖 Awesome GitHub Copilot
[![Powered by Awesome Copilot](https://img.shields.io/badge/Powered_by-Awesome_Copilot-blue?logo=githubcopilot)](https://aka.ms/awesome-github-copilot) [![GitHub contributors from allcontributors.org](https://img.shields.io/github/all-contributors/github/awesome-copilot?color=ee8449)](#contributors-)

A community-created collection of custom agents, instructions, skills, hooks, workflows, and plugins to supercharge your GitHub Copilot experience.

> [!TIP]
> **Explore the full collection on the website →** [awesome-copilot.github.com](https://awesome-copilot.github.com)
>
> The website offers full-text search and filtering across hundreds of resources, plus the [Learning Hub](https://awesome-copilot.github.com/learning-hub) for guides and tutorials.
>
> **Using this collection in an AI agent?** A machine-readable [`llms.txt`](https://awesome-copilot.github.com/llms.txt) is available with structured listings of all agents, instructions, and skills.

## 📖 Learning Hub

New to GitHub Copilot customization? The **[Learning Hub](https://awesome-copilot.github.com/learning-hub)** on the website offers curated articles, walkthroughs, and reference material — covering everything from core concepts like agents, skills, and instructions to hands-on guides for hooks, agentic workflows, MCP servers, and the Copilot coding agent.

[⬆ Back to Top](#-awesome-github-copilot)

## What's in this repo

| Resource | Description | Browse |
|----------|-------------|--------|
| 🤖 [Agents](docs/README.agents.md) | Specialized Copilot agents that integrate with MCP servers | [All agents →](https://awesome-copilot.github.com/agents) |
| 📋 [Instructions](docs/README.instructions.md) | Coding standards applied automatically by file pattern | [All instructions →](https://awesome-copilot.github.com/instructions) |
| 🎯 [Skills](docs/README.skills.md) | Self-contained folders with instructions and bundled assets | [All skills →](https://awesome-copilot.github.com/skills) |
| 🔌 [Plugins](docs/README.plugins.md) | Curated bundles of agents and skills for specific workflows | [All plugins →](https://awesome-copilot.github.com/plugins) |
| 🍳 [Cookbook](cookbook/README.md) | Copy-paste-ready recipes for working with Copilot APIs | — |

[⬆ Back to Top](#-awesome-github-copilot)

## Install a Plugin

For most users, the **Awesome Copilot** marketplace is already registered in the Copilot CLI/VS Code, so you can install a plugin directly:

```bash
copilot plugin install <plugin-name>@awesome-copilot
```

If you are using an older Copilot CLI version or a custom setup and see an error that the marketplace is unknown, register it once and then install:

```bash
copilot plugin marketplace add github/awesome-copilot
copilot plugin install <plugin-name>@awesome-copilot
```

[⬆ Back to Top](#-awesome-github-copilot)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) · [AGENTS.md](AGENTS.md) for AI agent guidance · [Security](SECURITY.md) · [Code of Conduct](CODE_OF_CONDUCT.md)

> The customizations here are sourced from third-party developers. Please inspect any agent and its documentation before installing.

[⬆ Back to Top](#-awesome-github-copilot)

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](./CONTRIBUTING.md#contributors-recognition)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.aaron-powell.com/"><img src="https://avatars.githubusercontent.com/u/434140?v=4" width="100px;" alt=""/><br /><sub><b>Aaron Powell</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://codemilltech.com/"><img src="https://avatars.githubusercontent.com/u/2053639?v=4" width="100px;" alt=""/><br /><sub><b>Matt Soucoup</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.buymeacoffee.com/troystaylor"><img src="https://avatars.githubusercontent.com/u/44444967?v=4" width="100px;" alt=""/><br /><sub><b>Troy Simeon Taylor</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/abbas133"><img src="https://avatars.githubusercontent.com/u/7757139?v=4" width="100px;" alt=""/><br /><sub><b>Abbas</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://calva.io/"><img src="https://avatars.githubusercontent.com/u/30010?v=4" width="100px;" alt=""/><br /><sub><b>Peter Strömberg</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://danielscottraynsford.com/"><img src="https://avatars.githubusercontent.com/u/7589164?v=4" width="100px;" alt=""/><br /><sub><b>Daniel Scott-Raynsford</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jhauga"><img src="https://avatars.githubusercontent.com/u/10998676?v=4" width="100px;" alt=""/><br /><sub><b>John Haugabook</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://witter.cz/@pavel"><img src="https://avatars.githubusercontent.com/u/7853836?v=4" width="100px;" alt=""/><br /><sub><b>Pavel Simsa</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://digitarald.de/"><img src="https://avatars.githubusercontent.com/u/8599?v=4" width="100px;" alt=""/><br /><sub><b>Harald Kirschner</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://mubaidr.js.org/"><img src="https://avatars.githubusercontent.com/u/2222702?v=4" width="100px;" alt=""/><br /><sub><b>Muhammad Ubaid Raza</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/tmeschter"><img src="https://avatars.githubusercontent.com/u/10506730?v=4" width="100px;" alt=""/><br /><sub><b>Tom Meschter</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.aungmyokyaw.com/"><img src="https://avatars.githubusercontent.com/u/9404824?v=4" width="100px;" alt=""/><br /><sub><b>Aung Myo Kyaw</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/JasonYeMSFT"><img src="https://avatars.githubusercontent.com/u/39359541?v=4" width="100px;" alt=""/><br /><sub><b>JasonYeMSFT</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/jrc356/"><img src="https://avatars.githubusercontent.com/u/37387479?v=4" width="100px;" alt=""/><br /><sub><b>Jon Corbin</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/troytaylor-msft"><img src="https://avatars.githubusercontent.com/u/248058374?v=4" width="100px;" alt=""/><br /><sub><b>troytaylor-msft</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://delatorre.dev/"><img src="https://avatars.githubusercontent.com/u/38289677?v=4" width="100px;" alt=""/><br /><sub><b>Emerson Delatorre</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/burkeholland"><img src="https://avatars.githubusercontent.com/u/686963?v=4" width="100px;" alt=""/><br /><sub><b>Burke Holland</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://yaooqinn.github.io/"><img src="https://avatars.githubusercontent.com/u/8326978?v=4" width="100px;" alt=""/><br /><sub><b>Kent Yao</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.devprodlogs.com/"><img src="https://avatars.githubusercontent.com/u/51440732?v=4" width="100px;" alt=""/><br /><sub><b>Daniel Meppiel</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/yeelam-gordon"><img src="https://avatars.githubusercontent.com/u/73506701?v=4" width="100px;" alt=""/><br /><sub><b>Gordon Lam</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.madskristensen.net/"><img src="https://avatars.githubusercontent.com/u/1258877?v=4" width="100px;" alt=""/><br /><sub><b>Mads Kristensen</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://ks6088ts.github.io/"><img src="https://avatars.githubusercontent.com/u/1254960?v=4" width="100px;" alt=""/><br /><sub><b>Shinji Takenaka</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/spectatora"><img src="https://avatars.githubusercontent.com/u/1385755?v=4" width="100px;" alt=""/><br /><sub><b>spectatora</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sinedied"><img src="https://avatars.githubusercontent.com/u/593151?v=4" width="100px;" alt=""/><br /><sub><b>Yohan Lasorsa</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/VamshiVerma"><img src="https://avatars.githubusercontent.com/u/21999324?v=4" width="100px;" alt=""/><br /><sub><b>Vamshi Verma</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://montemagno.com/"><img src="https://avatars.githubusercontent.com/u/1676321?v=4" width="100px;" alt=""/><br /><sub><b>James Montemagno</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://twitter.com/alefragnani"><img src="https://avatars.githubusercontent.com/u/3781424?v=4" width="100px;" alt=""/><br /><sub><b>Alessandro Fragnani</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/ambilykk/"><img src="https://avatars.githubusercontent.com/u/10282550?v=4" width="100px;" alt=""/><br /><sub><b>Ambily</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/krushideep"><img src="https://avatars.githubusercontent.com/u/174652083?v=4" width="100px;" alt=""/><br /><sub><b>krushideep</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mihsoft"><img src="https://avatars.githubusercontent.com/u/53946345?v=4" width="100px;" alt=""/><br /><sub><b>devopsfan</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://tgrall.github.io/"><img src="https://avatars.githubusercontent.com/u/541250?v=4" width="100px;" alt=""/><br /><sub><b>Tugdual Grall</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.promptboost.dev/"><img src="https://avatars.githubusercontent.com/u/5461862?v=4" width="100px;" alt=""/><br /><sub><b>Oren Me</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mjrousos"><img src="https://avatars.githubusercontent.com/u/10077254?v=4" width="100px;" alt=""/><br /><sub><b>Mike Rousos</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://devkimchi.com/"><img src="https://avatars.githubusercontent.com/u/1538528?v=4" width="100px;" alt=""/><br /><sub><b>Justin Yoo</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/guiopen"><img src="https://avatars.githubusercontent.com/u/94094527?v=4" width="100px;" alt=""/><br /><sub><b>Guilherme do Amaral Alves </b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/griffinashe/"><img src="https://avatars.githubusercontent.com/u/6391612?v=4" width="100px;" alt=""/><br /><sub><b>Griffin Ashe</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/anchildress1"><img src="https://avatars.githubusercontent.com/u/6563688?v=4" width="100px;" alt=""/><br /><sub><b>Ashley Childress</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.senseof.tech/"><img src="https://avatars.githubusercontent.com/u/50712277?v=4" width="100px;" alt=""/><br /><sub><b>Adrien Clerbois</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Vhivi"><img src="https://avatars.githubusercontent.com/u/38220028?v=4" width="100px;" alt=""/><br /><sub><b>ANGELELLI David</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://markdav.is/"><img src="https://avatars.githubusercontent.com/u/311063?v=4" width="100px;" alt=""/><br /><sub><b>Mark Davis</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/MattVevang"><img src="https://avatars.githubusercontent.com/u/20714898?v=4" width="100px;" alt=""/><br /><sub><b>Matt Vevang</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://max.irro.at/"><img src="https://avatars.githubusercontent.com/u/589073?v=4" width="100px;" alt=""/><br /><sub><b>Maximilian Irro</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nullchimp"><img src="https://avatars.githubusercontent.com/u/58362593?v=4" width="100px;" alt=""/><br /><sub><b>NULLchimp</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pkarda"><img src="https://avatars.githubusercontent.com/u/12649718?v=4" width="100px;" alt=""/><br /><sub><b>Peter Karda</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sdolgin"><img src="https://avatars.githubusercontent.com/u/576449?v=4" width="100px;" alt=""/><br /><sub><b>Saul Dolgin</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/shubham070"><img src="https://avatars.githubusercontent.com/u/5480589?v=4" width="100px;" alt=""/><br /><sub><b>Shubham Gaikwad</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/TheovanKraay"><img src="https://avatars.githubusercontent.com/u/24420698?v=4" width="100px;" alt=""/><br /><sub><b>Theo van Kraay</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/TianqiZhang"><img src="https://avatars.githubusercontent.com/u/5326582?v=4" width="100px;" alt=""/><br /><sub><b>Tianqi Zhang</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://blog.miniasp.com/"><img src="https://avatars.githubusercontent.com/u/88981?v=4" width="100px;" alt=""/><br /><sub><b>Will 保哥</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://tsubalog.hatenablog.com/"><img src="https://avatars.githubusercontent.com/u/1592808?v=4" width="100px;" alt=""/><br /><sub><b>Yuta Matsumura</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/anschnapp"><img src="https://avatars.githubusercontent.co

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
