"""pytest wrapper: one test per YAML flow in flows/.

Requires: a running emulator with the app installed & signed in,
and ANTHROPIC_API_KEY in the environment.

    pytest tests/ -v
"""

from pathlib import Path

import pytest

from bloom_e2e import AdbDevice, Flow, run_flow

FLOWS_DIR = Path(__file__).parent.parent / "flows"
FLOW_FILES = sorted(FLOWS_DIR.glob("*.yaml"))


@pytest.fixture(scope="session")
def device():
    return AdbDevice()


@pytest.mark.parametrize("flow_file", FLOW_FILES, ids=lambda p: p.stem)
def test_flow(flow_file: Path, device: AdbDevice):
    flow = Flow.from_yaml(flow_file)
    result = run_flow(flow, device=device, report_dir="e2e-reports")
    assert result.passed, result.reason
