"""CLI: bloom-e2e run flows/log_symptom.yaml [--device SERIAL] [--report out/]"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .adb import AdbDevice
from .runner import DEFAULT_PACKAGE, Flow, run_flow


def main() -> None:
    p = argparse.ArgumentParser(prog="bloom-e2e")
    sub = p.add_subparsers(dest="cmd", required=True)

    run = sub.add_parser("run", help="Run one or more YAML flows")
    run.add_argument("paths", nargs="+", help="Flow YAML file(s) or directory")
    run.add_argument("--device", default=None, help="adb serial (default: only device)")
    run.add_argument("--package", default=DEFAULT_PACKAGE)
    run.add_argument("--report", default="e2e-reports", help="Report output dir")

    args = p.parse_args()

    flow_files: list[Path] = []
    for raw in args.paths:
        path = Path(raw)
        flow_files += sorted(path.glob("*.yaml")) if path.is_dir() else [path]

    device = AdbDevice(serial=args.device)
    failed = 0
    for f in flow_files:
        flow = Flow.from_yaml(f)
        print(f"▶ {flow.name} ... ", end="", flush=True)
        result = run_flow(flow, device=device, package=args.package,
                          report_dir=args.report)
        print("PASS" if result.passed else f"FAIL — {result.reason}")
        failed += 0 if result.passed else 1

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
