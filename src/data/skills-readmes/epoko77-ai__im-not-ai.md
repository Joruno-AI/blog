<p align="center">
  <img src="assets/social-preview.png" alt="im-not-ai — 한글 AI 티 제거기" width="820">
</p>

# Humanize KR — 한글 AI 티 제거기 v2.3.2

> **English**: [`README.en.md`](README.en.md)

AI(ChatGPT · Claude · Gemini 등)가 쓴 한글 글을 **내용은 한 글자도 건드리지 않고** 문체 · 리듬 · 표현만 자연스러운 한국어로 되돌리는 CLI 스킬입니다.

번역투, 과도한 영어 인용, 기계적 병렬 ("첫째 · 둘째 · 셋째"), "결론적으로 / 시사하는 바가 크다" 같은 AI 특유 관용구, 피동태 남용, 문두 접속사 남발, 이모지·불릿 남용 등 **10대 카테고리 × 70 서브 패턴**(+검증 대기 hold 1건)을 심각도(S1/S2/S3)로 분류해 스팬 단위로 탐지한 뒤, 윤문합니다. 

## 설치 (Install)

> **Claude Code**, **GitHub Copilot CLI**, **OpenAI Codex CLI**, **Gemini CLI**를 지원합니다. 전체 가이드: [`INSTALL.md`](INSTALL.md)

**GitHub Copilot CLI — 플러그인 마켓플레이스 (클론 불필요, 권장)**

```bash
copilot plugin marketplace add epoko77-ai/im-not-ai
copilot plugin install humanize-korean@im-not-ai
copilot plugin list
```

Copilot에서 `humanize-korean 스킬로 이 글의 AI 티를 없애줘:`처럼 요청하거나 `/skills list`로 로드 여부를 확인하세요. 업데이트는 `copilot plugin update humanize-korean@im-not-ai`, 제거는 `copilot plugin uninstall humanize-korean@im-not-ai`입니다. Copilot은 **단일 호출 경로만** 제공하며 Claude Code 전용 진단·finalize 다중 호출 경로는 실행하지 않습니다.

> 호환성 참고: 1.0.79-5에서는 `copilot plugin install epoko77-ai/im-not-ai`도 동작하지만, CLI가 저장소 직접 설치의 사용 중단 예정 경고를 표시합니다. 신규 설치 경로로는 권장하지 않습니다.

**Claude Code — 플러그인 마켓플레이스 (클론 불필요, 권장)**

```
/plugin marketplace add epoko77-ai/im-not-ai
/plugin install humanize-korean@im-not-ai
```

새 세션에서 `/humanize-korean` (또는 자연어로 "이 글 AI 티 없애줘").

**Claude Code · Codex CLI — 클론 + 스크립트**

```bash
git clone https://github.com/epoko77-ai/im-not-ai.git
cd im-not-ai
./install.sh            # 설치된 claude/codex 자동 감지 → 전역 심링크
```

- Claude: `/humanize-korean` · Codex: `$humanize-korean`
- 한쪽만: `./install.sh --claude-only` / `--codex-only` · 제거: `./uninstall.sh`
- **업데이트**: `./update.sh` — 새 버전 자동 감지 후 `git pull` + 재설치(`--check`는 감지만). 마켓플레이스 설치는 `/plugin update`.
- Codex는 **단일 콜 경로만** 제공합니다. 다콜 경로(standard 2콜 · heavy 3+콜, 진단·finalize 포함)는 Claude Code 전용.

## 왜 한글 특화인가

영어권 humanizer(QuillBot · Hix · Undetectable AI)는 한국어에 약합니다. 한글 AI 글의 티는 대부분 **영어 번역투**에서 나옵니다. 

- "AI 기술을 **통해** 효율을 높**일 수 있다**" → "AI로 효율을 높인다"
- "이에 **있어서** 중요한 **점은**" → "여기서 중요한 건"
- "~**에 의해** 생성된" → "~가 만든"
- "**결론적으로**, 이는 **시사하는 바가 크다**" → (삭제)

이 도구는 그 한글 고유 패턴을 SSOT로 정리하고, 글의 상태에 맞는 세 경로(light 1콜 / standard 2콜 / heavy 3+콜) 중 하나로 윤문합니다. 잘 쓴 글일수록 콜 수가 줄어 빠르고 싸게 끝납니다.

## 4대 철칙

1. **의미 불변** — 사실 · 주장 · 수치 · 고유명사 · 직접 인용은 100% 원문 보존.
2. **근거 기반** — 탐지된 span에만 수술적 수정. 탐지 없는 구간은 건드리지 않음.
3. **장르 유지** — 칼럼을 문학으로, 리포트를 에세이로 옮기지 않음.
4. **과윤문 금지** — 변경률 30% 초과 시 경고, 50% 초과 시 강제 중단.

## 아키텍처 (v2.2) — route_hint 3경로

입력을 shim(`prepare_monolith_input.py`)이 먼저 정량 채점하고, 그 점수로 **`route_hint`(light | standard | heavy)** 를 결정적으로 산출합니다. 글의 상태가 경로를 정하고, 경로가 콜 수를 정합니다. 절감은 모델 교체가 아니라 **콜 수 축소**에서 옵니다(모델 선택은 사용자 몫).

| 경로 | LLM 콜 수 | 언제 | 파이프라인 |
|---|---|---|---|
| **light** | **1** | 잘 쓴 글 — 어휘 티가 거의 0 | 진단·finalize 생략, 보수 강도 단일 윤문. 손댈 게 거의 없으면 "이미 좋습니다"로 조기 종료 |
| **standard** | **2** | 보통의 AI 초안 — 어휘·구조 티 섞임 | 진단 1콜 + 겨냥 윤문 1콜. 1만자급도 청킹 없이 단일 윤문 콜 |
| **heavy** | **3+** | 중증 AI 슬롭 밀집 or 초장문(15,000자 초과) or 검증 증적 필요 | 진단 → 윤문(shim이 청크를 2개 이상 만든 경우에만 청크 병렬) → finalize |

```
입력 텍스트
    ↓
[prepare_monolith_input.py]  ── 정량 사전 점수 (KatFish·post-editese 지표) + route_hint 산출
    ↓                            실패 시 점수 없이 standard로 자동 진행 (graceful degrade)
    ├─ light ────→ [humanize-monolith ×1] ────────────────────────────→ final.md
    ├─ standard ─→ [humanize-diagnostician] → [monolith 겨냥 윤문] ───→ final.md
    └─ heavy ────→ [diagnostician] → [monolith(필요시 청크 병렬)] → [humanize-finalizer]
    ↓
[verify_change_rate.py]      ── 변경률 게이트 (결정적 코드 판정, exit code) — 모든 경로 공통
```

- 사용자 명시가 route_hint를 오버라이드합니다: `--strict`·"정밀 모드" → heavy 고정, "가볍게" → light 고정.
- **단일 콜 우선**: 청킹은 heavy 전용이며 15,000자 이하는 비권장. 실측으로 1만자 글을 청킹 7콜로 돌리면 610K 토큰, 단일 콜이면 134K(4.5배 절감, 품질 동등)였습니다 — 청크마다 룰북·진단을 재로드하는 비용이 절감분을 다 먹기 때문입니다.
- 이번 개선의 핵심 가치: **잘 쓴 글은 1콜로 싸게 끝납니다.** 어휘 티 없는 글에 최중량 파이프라인을 돌리던 낭비를 route_hint가 차단합니다.

## 에이전트 구성

윤문 실행에 쓰이는 에이전트는 아래 4개입니다.

| 에이전트 | 경로 | 역할 |
|---------|---|------|
| `humanize-monolith` | 전 경로 공용 | 단일 호출 윤문 (탐지·윤문·자체검증 일괄, 도구 호출 3회 캡) |
| `humanize-diagnostician` | standard·heavy | 글 전체의 지배 패턴 3~6개 진단, taxonomy ID + 처방 |
| `humanize-finalizer` | heavy | 원문 직접 대조로 의미 보존 15항 + 자연성 판정, 국소 보정 |
| `korean-ai-tell-taxonomist` | 별도 명령 | 분류 체계(SSOT) 관리, 신규 패턴 심사 승격 |

이 외에 `agents/`에는 릴리스 회차 전용 개발 도구 5개(`translationese-research-distiller` · `korean-translation-scholar` · `taxonomy-gap-analyzer` · `post-editese-metric-engineer` · `quick-rules-integrator` — v2.0 학술 흡수 작업용, 윤문 실행과 무관)가 함께 들어 있습니다.

옛 strict 5인 파이프라인의 `ai-tell-detector` · `korean-style-rewriter` · `content-fidelity-auditor` · `naturalness-reviewer`와 웹 확장 설계용 `humanize-web-architect`는 **v2.1에서 은퇴**했습니다(아래 v2.1 릴리스 노트 참조).

## AI 티 분류 체계 (요약)

| ID | 대분류 | 대표 서브 패턴 |
|----|-------|---------------|
| A | 번역투 | "~를 통해", "~에 대해", "~에 있어서", 이중 피동 "~되어진다", "가지고 있다", **"그/그녀" 강박적 사용 (A-16)**, **관계절 좌향 수식 (A-18)**, **"~에서의/~에로의" 이중 조사 (A-19)** |
| B | 영어 인용·용어 과다 | 과도한 괄호 병기, 번역 가능한 영어 그대로 |
| C | 구조적 AI 패턴 | 기계적 "첫째/둘째/셋째", 과도한 불릿·헤딩·이모지, 연결어미 뒤 쉼표 (C-11) |
| D | AI 특유 관용구 | "결론적으로", "시사하는 바가 크다", "주목할 만하다", "혁신적인" |
| E | 리듬 균일성 | 문장 길이 표준편차 낮음, 동일 종결어미 반복, **청자 경어법 일관성 손실 (E-7)** |
| F | 수식·중복 | "매우", "정말", 동의어 이중 수식, "~적/~성/~화/-tion/-ment" 남발 |
| G | Hedging 남용 | "~할 수 있을 것으로 보인다" 다중 완곡 |
| H | 접속사 남발 | 문두 "또한/따라서/즉/나아가" 연속 |
| I | 형식명사 과다 | "것이다", "점", "수", "바", "~할 필요가 있다" |
| J | 시각 장식 남용 | 과도한 **볼드**, "따옴표", 대시(—) 남발 |

전체 70 서브 패턴(+hold 1건)과 처방: [`ai-tell-taxonomy.md`](skills/humanize-korean/references/ai-tell-taxonomy.md) · [`rewriting-playbook.md`](skills/humanize-korean/references/rewriting-playbook.md) · 학술 인용 외부 SSOT: [`scholarship.md`](skills/humanize-korean/references/scholarship.md) (v2.0 신규)

## 심각도 & 품질 등급

**심각도**
- **S1 결정적**: 한 번만 나와도 AI 확신. 무조건 제거.
- **S2 강함**: 1~2회 허용, 3회+ 반복 시 제거.
- **S3 약함**: 다른 패턴과 중첩될 때만 문제.

**품질 등급 (윤문 후)**
- **A**: S1 0건, S2 ≤2건, 점수 개선 70%+
- **B**: S1 0건, S2 ≤4건, 개선 50%+
- **C**: S1 1~2건 or 과윤문 시그널 2개 → 2차 윤문
- **D**: S1 3건+ or 심각한 과윤문 → 사람 검토

## 사용법 — 5분이면 따라합니다

> **전역 설치([설치](#설치-install))를 마쳤다면** 1~2단계(클론·폴더 진입)는 건너뛰고, 아무 폴더에서나 바로 **3단계**로 가세요. 아래는 설치 없이 리포에서 곧바로 체험하는 흐름입니다.

### 0. 전제

아래 1~4단계는 3경로 전체를 제공하는 [Claude Code](https://claude.com/claude-code) 기준입니다. GitHub Copilot CLI·Codex CLI·Gemini CLI의 단일 호출 경로는 아래 각 도구별 방법을 참고하세요. Mac · Windows · Linux 모두 지원합니다.

설치 확인:
```bash
claude --version
```

> Claude Code는 터미널에서 Claude(Anthropic의 AI)와 대화하며 파일을 같이 편집하는 CLI입니다. 웹 버전 Claude.ai나 일반 ChatGPT에서는 이 저장소의 스킬이 자동 로드되지 않습니다.

### 1. 리포 받기

```bash
git clone https://github.com/epoko77-ai/im-not-ai.git
cd im-not-ai
```

### 2. Claude Code 켜기

```bash
claude
```

> **전역 설치를 했다면** 아무 폴더에서나 켜도 `/humanize-korean`이 동작합니다([설치](#설치-install) 참고).
> **설치 없이 체험만 하려면** 방금 클론한 `im-not-ai` 폴더 **안에서** 실행하세요(프로젝트 로컬 스킬이 로드됩니다). 다른 위치에서 켜면 일반 Claude Code처럼 동작합니다.

### 3. AI가 쓴 한글 글 붙여넣고 부탁하기

Claude Code에서는 세 가지 방법 중 편한 쪽으로 사용합니다. GitHub Copilot CLI·Codex CLI 사용자는 아래 **방법 D·E**를 참고하세요.

**방법 A — 자연어 한 문장 (가장 쉬움)**

평소 말투 그대로 쓰면 됩니다:

```
이 AI 글 자연스럽게 윤문해줘:

[ChatGPT / Claude / Gemini 초안 여기에 붙여넣기]
```

아래 표현 중 아무거나 쓰면 스킬이 자동 발동합니다:
- "AI 티 없애줘"
- "GPT 문체 제거해줘"
- "사람이 쓴 것처럼 윤문해줘"
- "번역투 제거"
- "한글 AI 윤문"

**방법 B — 슬래시 커맨드** *(v1.2~)*

```
/humanize [윤문할 텍스트 또는 파일 경로]
```

옵션을 인자 끝에 자연어로 적을 수 있습니다: `장르: 칼럼`, `강도: 적극`, `최소심각도: S1`. 결과가 마음에 안 들면 `/humanize-redo "번역투만 다시"` 같은 식으로 재실행. 두 진입점은 이제 스킬입니다: [`humanize`](skills/humanize/SKILL.md) · [`humanize-redo`](skills/humanize-redo/SKILL.md)

**방법 C — Plugin / 마켓플레이스 (공식)**

본체가 이제 Claude Code Plugin/Marketplace를 **공식 지원**합니다. 클론 없이 마켓플레이스로 설치하세요:

```
/plugin marketplace add epoko77-ai/im-not-ai
/plugin install humanize-korean@im-not-ai
```

스킬 3개 + 서브에이전트 9개가 함께 설치됩니다. 자세한 옵션·스크립트 설치는 [설치](#설치-install) 섹션과 [`INSTALL.md`](INSTALL.md) 참고. (초기 패키징을 탐색한 [`gaebalai/im-not-ai`](https://github.com/gaebalai/im-not-ai) 포크도 있습니다.)

**방법 D — GitHub Copilot CLI (공식, 단일 호출 경로)**

GitHub Copilot CLI 1.0.79-5에서 마켓플레이스 설치와 스킬 탐색을 확인했습니다.

```bash
copilot plugin marketplace add epoko77-ai/im-not-ai
copilot plugin install humanize-korean@im-not-ai
copilot plugin list
copilot skill list
```

새 Copilot 세션에서 `humanize-korean 스킬로 이 글을 자연스럽게 윤문해줘:` 또는 `이 글 AI 티 없애줘:`처럼 요청합니다. `/skills list`에서도 스킬을 확인할 수 있습니다. 업데이트는 `copilot plugin update humanize-korean@im-not-ai`, 제거는 `copilot plugin uninstall humanize-korean@im-not-ai`을 사용하세요.

Copilot은 Codex와 같은 **단일 호출 경로**를 사용합니다. Claude Code 전용 `route_hint` 3경로 오케스트레이션과 진단·finalize 서브에이전트는 Copilot에서 실행되지 않습니다.

> 저장소 직접 설치 명령 `copilot plugin install epoko77-ai/im-not-ai`은 1.0.79-5에서 동작하지만 사용 중단 예정 경고가 표시되는 호환성 경로입니다.

**방법 E — Codex CLI (공식, 단일 콜 경로)**

본체가 이제 Codex CLI Skills를 **공식 지원**합니다. 리포 클론 후 한 줄이면 `~/.codex/skills/`에 연결됩니다:

```bash
git clone https://github.com/epoko77-ai/im-not-ai.git && cd im-not-ai
./install.sh --codex-only
```

Codex에서 `$humanize-korean`으로 발동합니다(또는 `/skills` 메뉴). Codex는 **단일 콜 경로만** 제공하며, 다콜 경로(standard 2콜 · heavy 3+콜, 진단·finalize 포함)는 Claude Code 전용입니다. (Codex Desktop용 별도 어댑터로는 community 포트 [`Squirbie/im-not-ai-codex`](https://github.com/Squirbie/im-not-ai-codex)도 있습니다.)

**방법 F — Web UI (비공식)**

opencode 로 윤문하는 커뮤니티 제작 포트입니다.
- 접속: [im-not-ai-ocx.illuwa.click](https://im-not-ai-ocx.illuwa.click/)

### 커뮤니티 포트

공식 지원 런타임은 **Claude Code · Codex · Gemini CLI** 세 가지입니다. 저희가 라이브로 검증할 수 있는 범위를 넘어서면 "공식 지원" 을 표기하지 않는다는 정책이라, 그 밖의 런타임은 커뮤니티 포트로 안내합니다.

| 포트 | 런타임 | 제작 |
|---|---|---|
| [`Squirbie/im-not-ai-codex`](https://github.com/Squirbie/im-not-ai-codex) | Codex Desktop 어댑터 | @Squirbie |
| [im-not-ai-ocx](https://im-not-ai-ocx.illuwa.click/) | opencode Web UI | 커뮤니티 |

포트를 만드셨다면 Issue 로 알려주세요 — 확인 후 이 표에 추가합니다. 본체를 건드리지 않는 격리 설계와, 룰북 사본이 본진과 어긋나면 깨지는 드리프트 검사를 갖추는 것을 권장합니다([PR #61](https://github.com/epoko77-ai/im-not-ai/pull/61) 이 좋은 참고입니다).

### 4. 결과 확인

정량 사전 채점이 산출한 `route_hint`에 따라 세 경로 중 하나로 처리합니다(사용자 명시가 오버라이드).

**light (1콜 · 잘 쓴 글 · 1~2분)** — 진단·finalize 없이 `humanize-monolith` 한 콜이 보수 강도로 윤문합니다. 손댈 게 거의 없으면 "이미 좋습니다"와 손댄 곳 요약으로 조기 종료합니다.

**standard (2콜 · 보통의 AI 초안 · 2~5분)** — 진단 1콜이 지배 패턴을 짚고, 겨냥 윤문 1콜이 처리합니다. 1만자급도 청킹 없이 단일 윤문 콜입니다.

산출물은 `_workspace/{실행날짜-번호}/`에:

| 파일 | 내용 |
|------|------|
| `01_input.txt` | 원문 그대로 |
| `00_metrics.json` · `01_input_with_metrics.txt` | 정량 사전 점수 + `route_hint` + 점수 블록을 원문 앞에 붙인 결합 입력 (점수 계산 실패 시 standard로 자동 진행) |
| `02_diagnosis.md` | (standard·heavy) 지배 패턴 3~6개 진단 (taxonomy ID · 근거 · 처방 · 장르/격식) |
| `final.md` | 윤문본 + 본문 끝 `<!-- HUMANIZE-SUMMARY -->` 주석 블록(메트릭·카테고리 탐지 before/after·자체검증 6항·등급·주요 변경 하이라이트). HTML 주석이라 마크다운 뷰어·웹 게시·복사 시 본문에만 노출 |

**heavy (3+콜 · 중증 슬롭·초장문·증적 필요 · `--strict`로 강제 가능 · 5~8분)** — 진단 → 윤문(shim이 청크를 2개 이상 만든 경우에만 청크 병렬) → finalize. 위 산출물에 더해:

| 파일 | 내용 |
|------|------|
| `final_pre_finalize.md` | finalize 보정 전 윤문본 백업 |
| `09_finalize.json` | 의미 보존 15항 + 자연성 판정 결과 |

부분 재실행("이 카테고리만 다시"·"2차 윤문")은 heavy 경로로 자동 전환됩니다.

### 5. 결과가 맘에 안 들면

그대로 말씀하시면 됩니다. 재실행·수정 명령을 따로 외울 필요 없습니다:

- **"이 문단만 다시 윤문해줘"** — 해당 구간만 재시도
- **"번역투만 더 손봐줘"** (또는 "관용구만 다시") — 특정 카테고리만 재처리
- **"윤문 강도 낮춰줘"** — 보수적 윤문 (결정적 패턴만 제거)
- **"원문 톤을 더 살려줘"** — 변경률 상한을 낮춰 원문 유지
- **"2차 윤문해줘"** — 현재 결과를 한 번 더 다듬기

### 6. 다른 글로 또 돌리고 싶을 때

Claude Code 세션 안에서 새 글을 붙여넣고 똑같이 부탁하면 됩니다. 실행마다 새 `_workspace/{날짜-번호}/` 폴더가 만들어져 이전 결과와 섞이지 않습니다.

## Do-NOT List (탐지·윤문 대상 제외)

- 수치 · 단위 · 날짜
- 고유명사 · 인명 · 제품명 · 모델명
- 큰따옴표 내부 직접 인용
- 법률 · 규정 조문
- 학술 개념어 (불가피한 경우)

## 웹 서비스 확장 (옵션)

웹 버전은 별도 코드베이스로 운영 중입니다. 본 리포의 설계 문서 [`web-service-spec.md`](skills/humanize-korean/references/web-service-spec.md)는 산출물로 보존합니다 (설계 담당이던 `humanize-web-architect` 에이전트는 v2.1에서 은퇴).

## v2.3.2 — 플러그인 스킬 위치 정정 (2026-08)

**마켓플레이스·플러그인으로 설치하셨다면 업데이트를 권합니다.** 스킬은 로드됐지만 내부에서 두 층이 조용히 빠지고 있었습니다.

### 무엇이 문제였나

플러그인 로더는 스킬을 **플러그인 루트 `skills/`** 에서 기본 스캔합니다. 그런데 이 저장소는 `.claude/skills/` 에 두고 `plugin.json` 의 `skills` 필드로 가리키고 있었습니다.

스펙에 예외가 있습니다 — **marketplace 항목의 `source` 가 마켓플레이스 루트로 풀리면, 선언한 디렉터리가 기본 `skills/` 스캔을 대체합니다.** 우리 `source` 는 `"./"` 라 정확히 그 경우였고, 관례 위치는 비어 있었습니다.

결과가 로더마다 갈렸습니다.

| 환경 | 이전 |
|---|---|
| CLI 심링크 설치 | 정상 |
| CLI 마켓플레이스 설치 | 로드는 됐지만 **정량 shim·진단이 조용히 누락** |
| 관례 위치만 스캔하는 로더(Cowork 등) | **스킬 자체를 못 찾음** |

두 번째가 특히 문제였습니다. `route_hint` 와 철칙 #4 게이트가 사라진 채로도 **결과물은 정상적으로 나오기 때문에** 품질이 떨어진 것을 알아채기 어려웠습니다.

### 고친 것

- 스킬 3종을 **`.claude/skills/` → `skills/`** (관례 위치)로 이동. `plugin.json` 의 `skills` 필드 제거 — 루트 `skills/` 는 기본 스캔 대상이라 선언이 불필요하고, 선언하면 오히려 예외 조항에 걸립니다.
- **`${SKILL_ROOT}` 유도를 깊이 비의존으로.** `.claude-plugin/` 마커를 만날 때까지 거슬러 올라갑니다. 고정 횟수(`cd ../../..`)는 레이아웃이 바뀌면 조용히 엉뚱한 곳을 가리킵니다.
- 끊어져 있던 `codex/skills/.../references` 심링크 복구.

에이전트는 같은 이유로 이미 루트 `agents/` 에 있었습니다([#26](https://github.com/epoko77-ai/im-not-ai/pull/26)). 스킬만 남아 있었던 것입니다.

### 업데이트 방법

```bash
# 플러그인
/plugin update humanize-korean

# 스크립트 설치
./update.sh          # 또는 ./install.sh
```

⚠️ **심링크로 설치하셨다면 링크가 끊어집니다.** `.claude/skills/` 가 사라졌기 때문입니다. `./install.sh` 를 다시 돌리면 복구됩니다.

### 검증

- `pytest` **236 passed** (레이아웃 회귀 4건 신설 — 구 위치 부활 금지, `skills` 필드 재도입 금지, 고정 깊이 유도 금지)
- `claude plugin validate .` 통과
- 격리 환경 설치 실측 · `${SKILL_ROOT}` 유도 4종(저장소 직접·심링크·깊이 2·깊이 3) 검증

제보해주신 분들 덕에 잡혔습니다. 세 건 모두 **실제로 설치해 쓴 분들**에게서 왔고, 저장소 안에서만 테스트하면 원리적으로 보이지 않는 것들이었습니다.

## v2.3.1 — 경로 해석 · 런타임 경계 · 계약 정합 (2026-08)

**외부 제보로 드러난 실행 불가 경로를 고친 패치 회차입니다. 기능·분류 체계 변경은 없습니다.**

### 고친 것

- **`--run-dir` 상대경로가 cwd 가 아닌 저장소 루트 기준으로 해석**되던 문제 ([#71](https://github.com/epoko77-ai/im-not-ai/issues/71), [@bukbuk82-alt](https://github.com/bukbuk82-alt)). SKILL.md 는 "모든 경로는 cwd 기준"이라 지시하는데 스크립트는 반대로 동작해, **심링크로 설치해 작업 디렉터리에서 스킬을 부르면 첫 실행부터 항상 실패**했습니다. 저장소 루트에서 돌리면 `cwd == PROJECT_ROOT` 라 내부에서는 드러나지 않던 버그입니다. `--diagnosis` 도 같은 기준으로 통일했고, 실패할 때마다 빈 `_workspace/{run_id}/` 가 쌓이던 부작용도 제거했습니다.

- **프로덕션 게이트가 `tests/` 를 런타임 import** 하던 경계 위반 ([#59](https://github.com/epoko77-ai/im-not-ai/issues/59), [@andrea9292](https://github.com/andrea9292)). `verify_gates.py` 가 `tests/golden/checks.py` 를 불러 쓰고 있어, 런타임 파일만 선별 배포하면 **P3 golden 축이 통째로 죽었습니다.** `checks.py` 는 이름만 tests 아래 있었을 뿐 전부 프로덕션 검사 로직이라 `scripts/` 로 옮겼습니다.

- **Light 경로 finalize 승급이 실행 불가**하던 계약 공백 ([#54](https://github.com/epoko77-ai/im-not-ai/issues/54), [@andrea9292](https://github.com/andrea9292)). Light 는 `02_diagnosis.md` 를 만들지 않는데 finalizer 가 그 파일을 필수로 요구했습니다. `diagnosis_path` 를 선택으로 바꾸고, **진단 콜을 추가하지 않는 쪽**을 의도로 명문화했습니다 — finalize 본체(의미 보존 15항 + 자연성)는 원문↔윤문본 직접 대조로 성립합니다.

- **내용 앵커 유실** ([#74](https://github.com/epoko77-ai/im-not-ai/issues/74), [@ruddyscent](https://github.com/ruddyscent)). 윤문 콜이 편집 **전에** 문장별 핵심 내용 명사를 기록하고, 앵커가 사라지는 edit 은 즉시 롤백하는 `anchor_ledger` 계약을 배포 경로 5곳에 적용했습니다. 실측(opus-5 × `fx_guard_overedit`, 계약 적용 전후 각 11 run): **보호 어휘 유실 2회 → 0회.**

- **전역 설치 범위 한정** ([#70](https://github.com/epoko77-ai/im-not-ai/pull/70), [@penta505](https://github.com/penta505)) — 스킬이 실제로 쓰는 런타임 4종만 설치(`--all-agents` 로 전체). **구버전 설치본 자동 정리**([#73](https://github.com/epoko77-ai/im-not-ai/issues/73), 원안 [@yswyang0228](https://github.com/yswyang0228)) — 재실행 시 범위 밖·은퇴 dangling 링크를 해제합니다. 소유권은 심링크 대상으로만 판별해 사용자 파일·타 도구 링크는 건드리지 않습니다.

- **배포 정합** ([@pe

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
