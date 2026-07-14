"""Agentic loop: goal + screenshot -> Claude picks an action -> execute -> repeat."""

from __future__ import annotations

import base64
import time
from dataclasses import dataclass, field

import anthropic

from .adb import AdbDevice

MODEL = "claude-sonnet-5"

SYSTEM_PROMPT = """\
You are an end-to-end UI test agent controlling an Android app via screenshots.
You are given a GOAL and SUCCESS CRITERIA. On each turn you see the current
screenshot. Choose exactly one tool call per turn.

Rules:
- Coordinates refer to the screenshot you see.
- Prefer small, verifiable steps. After entering data, verify it saved.
- If the same screen repeats after your action, try a different approach once,
  then call finish(verdict="fail") with an explanation.
- Call finish(verdict="pass") ONLY when the success criteria are visibly met
  in the screenshot. Cite what you see as evidence.
"""

TOOLS = [
    {"name": "tap", "description": "Tap a point on the screen.",
     "input_schema": {"type": "object", "properties": {
         "x": {"type": "integer"}, "y": {"type": "integer"},
         "reason": {"type": "string"}},
         "required": ["x", "y", "reason"]}},
    {"name": "swipe", "description": "Swipe/scroll the screen.",
     "input_schema": {"type": "object", "properties": {
         "direction": {"type": "string", "enum": ["up", "down", "left", "right"]}},
         "required": ["direction"]}},
    {"name": "type_text", "description": "Type text into the focused field.",
     "input_schema": {"type": "object", "properties": {
         "text": {"type": "string"}}, "required": ["text"]}},
    {"name": "key", "description": "Press a key (BACK, ENTER, DEL, TAB).",
     "input_schema": {"type": "object", "properties": {
         "name": {"type": "string"}}, "required": ["name"]}},
    {"name": "wait", "description": "Wait for the app to settle.",
     "input_schema": {"type": "object", "properties": {
         "seconds": {"type": "number"}}, "required": ["seconds"]}},
    {"name": "finish", "description": "End the test with a verdict.",
     "input_schema": {"type": "object", "properties": {
         "verdict": {"type": "string", "enum": ["pass", "fail"]},
         "reason": {"type": "string"}},
         "required": ["verdict", "reason"]}},
]


@dataclass
class Step:
    action: str
    args: dict
    screenshot_jpeg: bytes


@dataclass
class AgentResult:
    passed: bool
    reason: str
    steps: list[Step] = field(default_factory=list)
    error: str | None = None


class Agent:
    def __init__(self, device: AdbDevice, model: str = MODEL,
                 max_steps: int = 25, client: anthropic.Anthropic | None = None):
        self.device = device
        self.model = model
        self.max_steps = max_steps
        self.client = client or anthropic.Anthropic()

    def run(self, goal: str, success_criteria: str) -> AgentResult:
        messages: list[dict] = []
        steps: list[Step] = []
        task = (f"GOAL: {goal}\n\nSUCCESS CRITERIA: {success_criteria}\n\n"
                f"Current screen is attached. Begin.")

        for i in range(self.max_steps):
            shot = self.device.screenshot()
            jpeg = shot.jpeg_bytes()
            content = [
                {"type": "text", "text": task if i == 0 else "Current screen:"},
                {"type": "image", "source": {
                    "type": "base64", "media_type": "image/jpeg",
                    "data": base64.b64encode(jpeg).decode()}},
            ]
            messages.append({"role": "user", "content": content})

            resp = self.client.messages.create(
                model=self.model, max_tokens=1024,
                system=SYSTEM_PROMPT, tools=TOOLS,
                tool_choice={"type": "any"}, messages=messages,
            )
            messages.append({"role": "assistant", "content": resp.content})

            tool_use = next(b for b in resp.content if b.type == "tool_use")
            name, args = tool_use.name, dict(tool_use.input)
            steps.append(Step(action=name, args=args, screenshot_jpeg=jpeg))

            if name == "finish":
                return AgentResult(passed=args["verdict"] == "pass",
                                   reason=args["reason"], steps=steps)

            self._execute(name, args, shot)
            self.device.wait_idle(timeout=3)

            messages.append({"role": "user", "content": [
                {"type": "tool_result", "tool_use_id": tool_use.id,
                 "content": "done"}]})
            # keep context small: drop old screenshots, keep last 3
            self._trim_images(messages, keep=3)

        return AgentResult(passed=False, steps=steps,
                           reason=f"Exceeded max_steps ({self.max_steps})")

    def _execute(self, name: str, args: dict, shot) -> None:
        if name == "tap":
            self.device.tap(args["x"], args["y"], shot.scale)
        elif name == "swipe":
            self.device.swipe(args["direction"], shot.scale, shot.native_size)
        elif name == "type_text":
            self.device.type_text(args["text"])
        elif name == "key":
            self.device.key(args["name"])
        elif name == "wait":
            time.sleep(min(float(args["seconds"]), 10))

    # -- scripted mode -------------------------------------------------------
    # Human authors the steps; AI only locates elements and judges assertions.
    # Each AI step is a single, context-free vision call (cheap, deterministic).

    def run_scripted(self, script: list[dict]) -> AgentResult:
        steps: list[Step] = []
        for i, raw in enumerate(script, 1):
            action, arg = next(iter(raw.items()))
            shot = self.device.screenshot()
            jpeg = shot.jpeg_bytes()
            steps.append(Step(action=action, args={"arg": arg},
                              screenshot_jpeg=jpeg))

            if action == "tap":
                ok, why = self._locate_and_tap(str(arg), shot, jpeg)
                if not ok:
                    return AgentResult(
                        passed=False, steps=steps,
                        reason=f'Step {i} tap "{arg}": {why}')
            elif action == "assert":
                ok, why = self._check(str(arg), jpeg)
                if not ok:
                    return AgentResult(
                        passed=False, steps=steps,
                        reason=f'Step {i} assert "{arg}": {why}')
            elif action == "type":
                self.device.type_text(str(arg))
            elif action == "swipe":
                self.device.swipe(str(arg), shot.scale, shot.native_size)
            elif action == "key":
                self.device.key(str(arg))
            elif action == "wait":
                time.sleep(min(float(arg), 30))
            else:
                return AgentResult(passed=False, steps=steps,
                                   reason=f"Step {i}: unknown action '{action}'")

            if action != "wait":
                self.device.wait_idle(timeout=3)

        return AgentResult(passed=True, steps=steps,
                           reason="All scripted steps completed")

    _LOCATE_TOOLS = [
        {"name": "tap", "description": "Tap the described element.",
         "input_schema": {"type": "object", "properties": {
             "x": {"type": "integer"}, "y": {"type": "integer"}},
             "required": ["x", "y"]}},
        {"name": "not_found",
         "description": "The described element is not visible on screen.",
         "input_schema": {"type": "object", "properties": {
             "reason": {"type": "string"}}, "required": ["reason"]}},
    ]

    _ASSERT_TOOLS = [
        {"name": "verdict", "description": "Judge the assertion.",
         "input_schema": {"type": "object", "properties": {
             "holds": {"type": "boolean"},
             "evidence": {"type": "string"}},
             "required": ["holds", "evidence"]}},
    ]

    def _one_shot(self, prompt: str, jpeg: bytes, tools: list[dict]):
        resp = self.client.messages.create(
            model=self.model, max_tokens=512, tools=tools,
            tool_choice={"type": "any"},
            messages=[{"role": "user", "content": [
                {"type": "text", "text": prompt},
                {"type": "image", "source": {
                    "type": "base64", "media_type": "image/jpeg",
                    "data": base64.b64encode(jpeg).decode()}}]}],
        )
        return next(b for b in resp.content if b.type == "tool_use")

    def _locate_and_tap(self, description: str, shot, jpeg: bytes,
                        scroll_retries: int = 2) -> tuple[bool, str]:
        for attempt in range(scroll_retries + 1):
            tu = self._one_shot(
                f"In this Android app screenshot, locate: {description}. "
                f"Tap it, or report not_found.", jpeg, self._LOCATE_TOOLS)
            if tu.name == "tap":
                self.device.tap(tu.input["x"], tu.input["y"], shot.scale)
                return True, ""
            if attempt < scroll_retries:  # not visible — scroll and retry
                self.device.swipe("up", shot.scale, shot.native_size)
                self.device.wait_idle(timeout=2)
                shot = self.device.screenshot()
                jpeg = shot.jpeg_bytes()
        return False, tu.input.get("reason", "not found")

    def _check(self, assertion: str, jpeg: bytes) -> tuple[bool, str]:
        tu = self._one_shot(
            f"Does this Android app screenshot satisfy the assertion below? "
            f"Judge strictly on what is visible.\nASSERTION: {assertion}",
            jpeg, self._ASSERT_TOOLS)
        return bool(tu.input["holds"]), tu.input.get("evidence", "")

    @staticmethod
    def _trim_images(messages: list[dict], keep: int) -> None:
        seen = 0
        for msg in reversed(messages):
            if msg["role"] != "user" or not isinstance(msg["content"], list):
                continue
            for block in msg["content"]:
                if isinstance(block, dict) and block.get("type") == "image":
                    seen += 1
                    if seen > keep:
                        block["type"] = "text"
                        block["text"] = "[earlier screenshot removed]"
                        block.pop("source", None)
