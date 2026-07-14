"""Load YAML flows and run them through the agent."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml

from .adb import AdbDevice
from .agent import Agent, AgentResult

DEFAULT_PACKAGE = "com.newlifejournal.app"  # from app.json


@dataclass
class Flow:
    """A test flow. Two modes:

    - agentic:  `goal` + `success_criteria` — AI decides every action.
    - scripted: `steps` — human authors each step; AI only locates
      elements ("tap: the FAB") and judges `assert:` steps.
    """
    name: str
    goal: str | None = None
    success_criteria: str | None = None
    steps: list[dict] | None = None
    max_steps: int = 25
    preconditions: list[str] | None = None

    @property
    def mode(self) -> str:
        return "scripted" if self.steps else "agentic"

    @classmethod
    def from_yaml(cls, path: str | Path) -> "Flow":
        data = yaml.safe_load(Path(path).read_text())
        steps = data.get("steps")
        if steps is None and not (data.get("goal") and data.get("success_criteria")):
            raise ValueError(
                f"{path}: flow needs either 'steps' (scripted) or "
                f"'goal' + 'success_criteria' (agentic)")
        return cls(
            name=data["name"],
            goal=(data.get("goal") or "").strip() or None,
            success_criteria=(data.get("success_criteria") or "").strip() or None,
            steps=steps,
            max_steps=data.get("max_steps", 25),
            preconditions=data.get("preconditions"),
        )


def run_flow(flow: Flow, device: AdbDevice | None = None,
             package: str = DEFAULT_PACKAGE,
             report_dir: str | Path | None = None) -> AgentResult:
    device = device or AdbDevice()

    if flow.preconditions and "app_launched" in flow.preconditions:
        device.launch(package)
        device.wait_idle(timeout=8)

    agent = Agent(device, max_steps=flow.max_steps)
    if flow.mode == "scripted":
        result = agent.run_scripted(flow.steps)
    else:
        result = agent.run(flow.goal, flow.success_criteria)

    if report_dir:
        from .report import write_report
        write_report(flow, result, Path(report_dir))
    return result
