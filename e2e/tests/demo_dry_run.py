"""Dry run: exercises the real Flow -> Agent.run_scripted -> report pipeline
with a mocked device (synthetic screenshots) and mocked AI (canned tool calls).

No emulator or API key needed. Produces e2e-reports/log_symptom_scripted.html.

    python3 tests/demo_dry_run.py
"""

from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).parent.parent))

from PIL import Image, ImageDraw

from bloom_e2e.adb import AdbDevice, Screenshot
from bloom_e2e.agent import Agent
from bloom_e2e.report import write_report
from bloom_e2e.runner import Flow

FLOW = Path(__file__).parent.parent / "flows" / "log_symptom_scripted.yaml"

# ---- mock device: renders fake app screens instead of calling adb ----------

SCREENS = ["Home", "Timeline", "Add Symptom form", "Symptom saved - Timeline"]


class MockDevice(AdbDevice):
    def __init__(self):
        super().__init__()
        self.frame = 0
        self.log: list[str] = []

    def screenshot(self) -> Screenshot:
        img = Image.new("RGB", (390, 844), "#E0F2F3")
        d = ImageDraw.Draw(img)
        d.rectangle([0, 0, 390, 90], fill="#81bec1")
        label = SCREENS[min(self.frame, len(SCREENS) - 1)]
        d.text((20, 40), f"Bloom & Bump — {label}", fill="white")
        d.text((20, 400), f"(mock frame {self.frame})", fill="#555")
        d.ellipse([320, 740, 375, 795], fill="#81bec1")  # FAB
        d.text((340, 758), "+", fill="white")
        return Screenshot(image=img, scale=1.0, native_size=(390, 844))

    def shell(self, *args, **kw) -> str:  # intercept all adb calls
        self.log.append(" ".join(args))
        if args[:2] == ("input", "tap"):
            self.frame += 1
        return ""

    def wait_idle(self, timeout=3.0, interval=0.7) -> None:
        pass


# ---- mock AI client: locates every element, passes the final assert --------

class MockClient:
    class messages:  # noqa: N801 — mimics anthropic client shape
        @staticmethod
        def create(*, tools, **kw):
            names = {t["name"] for t in tools}
            if "tap" in names:
                block = SimpleNamespace(type="tool_use", id="t1", name="tap",
                                        input={"x": 195, "y": 422})
            else:
                block = SimpleNamespace(
                    type="tool_use", id="t1", name="verdict",
                    input={"holds": True,
                           "evidence": "Mock: Nausea entry visible with "
                                       "orange border in current week."})
            return SimpleNamespace(content=[block])


def main() -> None:
    flow = Flow.from_yaml(FLOW)
    device = MockDevice()
    agent = Agent(device, client=MockClient())

    result = agent.run_scripted(flow.steps)

    report_dir = Path(__file__).parent.parent / "e2e-reports"
    path = write_report(flow, result, report_dir)

    print(f"mode:    {flow.mode}")
    print(f"verdict: {'PASS' if result.passed else 'FAIL'} — {result.reason}")
    print(f"steps:   {len(result.steps)}")
    print(f"adb calls issued: {len(device.log)} (e.g. {device.log[0]!r})")
    print(f"report:  {path}")


if __name__ == "__main__":
    main()
