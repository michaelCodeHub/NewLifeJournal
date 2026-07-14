# Agentic E2E Testing Library — Plan

AI-driven end-to-end testing for Bloom & Bump on the Android emulator. A Claude agent is given a goal in plain English ("log a Nausea symptom with severity 3 and verify it appears in the timeline"), then drives the app itself: screenshot → decide → tap/type/swipe → repeat → declare PASS/FAIL with evidence.

## Why this approach

- No selectors or test IDs needed — works on the app as-is, resilient to UI refactors.
- Flows are written in English (YAML), so non-engineers can add tests.
- Every run produces a screenshot-by-screenshot report, so failures are self-explaining.

Trade-off: agentic runs are slower and cost API tokens. Mitigations below (image downscaling, step caps, screenshot diffing to skip redundant vision calls).

## Architecture

```
e2e/
├── PLAN.md
├── pyproject.toml
├── bloom_e2e/
│   ├── __init__.py
│   ├── adb.py          # Device driver: screenshot, tap, swipe, type, keys, app lifecycle
│   ├── agent.py        # Claude agentic loop + tool definitions
│   ├── runner.py       # Loads YAML flows, runs agent, collects results
│   ├── report.py       # HTML report: steps, screenshots, verdicts
│   └── cli.py          # `bloom-e2e run flows/ --device emulator-5554`
├── flows/
│   ├── log_symptom.yaml
│   ├── add_visit.yaml
│   └── timeline_filter.yaml
└── tests/
    └── test_flows.py   # pytest wrapper: one test per YAML flow
```

### 1. Device driver (`adb.py`)

Pure `adb` — no Appium, no computer-use dependency at runtime:

- `screenshot()` → `adb exec-out screencap -p` → PNG bytes (downscaled to ~1092px long edge before sending to Claude to cut token cost).
- `tap(x, y)`, `swipe(x1,y1,x2,y2,ms)`, `type_text(s)` (`adb shell input`), `key(BACK|ENTER|...)`.
- Coordinate scaling: agent sees the downscaled image; driver maps coords back to native resolution.
- App lifecycle: `launch(package)`, `force_stop`, `clear_data` for clean-state runs.
- `wait_idle()` heuristic: poll screenshots until two consecutive frames match (app settled).

### 2. Agent loop (`agent.py`)

Claude (vision + tool use) with tools:

| Tool | Purpose |
|---|---|
| `tap(x, y, reason)` | Tap element visible in screenshot |
| `swipe(direction)` | Scroll lists / dismiss |
| `type_text(text)` | Enter text into focused field |
| `key(name)` | BACK, ENTER, etc. |
| `wait(seconds)` | Let animations/network settle |
| `finish(verdict, reason)` | PASS / FAIL with explanation |

Loop: send goal + success criteria + fresh screenshot → Claude picks a tool → execute via adb → new screenshot → repeat. Guardrails: `max_steps` (default 25), per-step timeout, loop detection (same action on identical screenshot twice → fail fast).

### 3. Flows (YAML) — two modes, chosen per flow

**Agentic** — AI decides every action from a goal. Best for exploratory testing:

```yaml
name: log_symptom
goal: >
  From the home screen, open Timeline, use the FAB to add a Symptom:
  type Nausea, severity 3, note "test entry". Save it.
success_criteria: >
  Timeline shows a Nausea entry with severity 3 in the current week.
preconditions: [app_launched]
max_steps: 20
```

**Scripted (human-in-the-loop)** — human authors each step; AI only locates
elements and judges assertions. Deterministic, ~1 cheap vision call per AI
step, failures point at an exact step. Best for regression suites:

```yaml
name: log_symptom_scripted
preconditions: [app_launched]
steps:
  - tap: "the Timeline tab in the bottom navigation"
  - tap: "the floating action button (+)"
  - type: "e2e test entry"
  - key: BACK
  - swipe: up
  - wait: 2
  - assert: "timeline shows a Nausea entry in the current week"
```

Step verbs: `tap` (AI locates; auto-scrolls up to 2× if not visible),
`assert` (AI judges), `type`, `key`, `swipe`, `wait` (mechanical, no AI call).
Human involvement: author/maintain scripted flows, review agentic reports.

### 4. Runner + report

- `runner.py` executes flows sequentially (parallel emulators later), records every step: screenshot, action, agent reasoning.
- `report.py` emits a single-file HTML report per run.
- `tests/test_flows.py` parametrizes pytest over `flows/*.yaml` → works in CI, JUnit XML for free.

## App-specific concerns

- **Auth**: Google Sign-In can't be reliably automated. Options: (a) run against an emulator snapshot that's already signed in (recommended, zero code), (b) add a dev-only email/password or anonymous auth path behind `__DEV__`.
- **Seed data**: use the existing Admin screen — a `setup` flow taps "Initialize Week Data" / "Add Dummy Data" before test flows run. Later: seed Firestore directly via Admin SDK for speed.
- **Firestore isolation**: point E2E builds at the Firebase emulator suite or a dedicated test project so runs don't pollute real data.

## Cost & speed controls

- Downscale screenshots; JPEG at quality ~80.
- Skip a vision call when the screen hasn't changed (pixel-diff) and the last action was `wait`.
- Cache the system prompt; small model (Haiku) for navigation, escalate to Sonnet only on `finish` verification if needed.

## Milestones

1. **M1 — Skeleton (this scaffold)**: adb driver, agent loop, one flow, HTML report.
2. **M2 — Reliability**: loop detection, wait_idle, retries, coordinate-scaling tests.
3. **M3 — Coverage**: flows for visits, symptoms, timeline filters, chat, admin.
4. **M4 — CI**: headless emulator in GitHub Actions (`reactivecircus/android-emulator-runner`), snapshot with signed-in state, nightly run + report artifact.

## Usage (once implemented)

```bash
cd e2e && pip install -e .
export ANTHROPIC_API_KEY=...
bloom-e2e run flows/log_symptom.yaml          # single flow
pytest tests/ -v                               # all flows
```
