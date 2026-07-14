"""Single-file HTML report with per-step screenshots."""

from __future__ import annotations

import base64
import html
import json
from datetime import datetime
from pathlib import Path

from .agent import AgentResult
from .runner import Flow


def write_report(flow: Flow, result: AgentResult, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    verdict = "PASS" if result.passed else "FAIL"
    color = "#4CAF50" if result.passed else "#F44336"

    rows = []
    for i, step in enumerate(result.steps, 1):
        img = base64.b64encode(step.screenshot_jpeg).decode()
        rows.append(f"""
        <div class="step">
          <h3>Step {i}: {html.escape(step.action)}</h3>
          <pre>{html.escape(json.dumps(step.args, indent=2))}</pre>
          <img src="data:image/jpeg;base64,{img}" alt="step {i}">
        </div>""")

    doc = f"""<!doctype html><html><head><meta charset="utf-8">
<title>{html.escape(flow.name)} — {verdict}</title>
<style>
 body {{ font-family: -apple-system, sans-serif; margin: 2rem; background: #E0F2F3; }}
 .verdict {{ color: {color}; }}
 .step {{ background: #fff; border-radius: 8px; padding: 1rem; margin: 1rem 0; }}
 img {{ max-width: 320px; border: 1px solid #ccc; border-radius: 6px; }}
 pre {{ background: #f6f6f6; padding: .5rem; border-radius: 4px; }}
</style></head><body>
<h1>{html.escape(flow.name)} — <span class="verdict">{verdict}</span></h1>
<p><b>Mode:</b> {flow.mode}</p>
<p><b>Goal:</b> {html.escape(flow.goal or f"{len(flow.steps or [])} scripted steps")}</p>
<p><b>Verdict reason:</b> {html.escape(result.reason)}</p>
<p><i>{datetime.now().isoformat(timespec="seconds")}</i></p>
{''.join(rows)}
</body></html>"""

    path = out_dir / f"{flow.name}.html"
    path.write_text(doc)
    return path
