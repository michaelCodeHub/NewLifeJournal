"""ADB device driver: screenshots and input for an Android emulator/device.

The agent sees screenshots downscaled to MAX_EDGE px on the long edge;
tap coordinates from the agent are in that downscaled space and are
mapped back to native resolution here.
"""

from __future__ import annotations

import io
import subprocess
import time
from dataclasses import dataclass

from PIL import Image

MAX_EDGE = 1092  # long-edge px sent to the model (keeps vision tokens low)

KEYCODES = {
    "BACK": "KEYCODE_BACK",
    "ENTER": "KEYCODE_ENTER",
    "HOME": "KEYCODE_HOME",
    "TAB": "KEYCODE_TAB",
    "DEL": "KEYCODE_DEL",
}


@dataclass
class Screenshot:
    image: Image.Image      # downscaled image (what the agent sees)
    scale: float            # native = agent_coord / scale
    native_size: tuple[int, int]

    def jpeg_bytes(self, quality: int = 80) -> bytes:
        buf = io.BytesIO()
        self.image.convert("RGB").save(buf, format="JPEG", quality=quality)
        return buf.getvalue()


class AdbDevice:
    def __init__(self, serial: str | None = None, adb: str = "adb"):
        self.serial = serial
        self.adb = adb

    # -- plumbing ----------------------------------------------------------
    def _cmd(self, *args: str) -> list[str]:
        base = [self.adb]
        if self.serial:
            base += ["-s", self.serial]
        return base + list(args)

    def shell(self, *args: str, timeout: int = 30) -> str:
        out = subprocess.run(
            self._cmd("shell", *args), capture_output=True, timeout=timeout
        )
        return out.stdout.decode(errors="replace")

    # -- observation -------------------------------------------------------
    def screenshot(self) -> Screenshot:
        raw = subprocess.run(
            self._cmd("exec-out", "screencap", "-p"),
            capture_output=True, timeout=30, check=True,
        ).stdout
        img = Image.open(io.BytesIO(raw))
        native = img.size
        scale = min(1.0, MAX_EDGE / max(native))
        if scale < 1.0:
            img = img.resize(
                (round(native[0] * scale), round(native[1] * scale)),
                Image.LANCZOS,
            )
        return Screenshot(image=img, scale=scale, native_size=native)

    def wait_idle(self, timeout: float = 5.0, interval: float = 0.7) -> None:
        """Poll until two consecutive screenshots are (nearly) identical."""
        prev = None
        deadline = time.time() + timeout
        while time.time() < deadline:
            cur = self.screenshot().jpeg_bytes(quality=40)
            if prev is not None and cur == prev:
                return
            prev = cur
            time.sleep(interval)

    # -- actions (agent coords: downscaled space) ---------------------------
    def tap(self, x: int, y: int, scale: float) -> None:
        self.shell("input", "tap", str(round(x / scale)), str(round(y / scale)))

    def swipe(self, direction: str, scale: float,
              native_size: tuple[int, int], ms: int = 300) -> None:
        w, h = native_size
        cx, cy = w // 2, h // 2
        d = h // 4
        vec = {
            "up": (cx, cy + d, cx, cy - d),      # scroll content up (finger up)
            "down": (cx, cy - d, cx, cy + d),
            "left": (cx + d, cy, cx - d, cy),
            "right": (cx - d, cy, cx + d, cy),
        }[direction]
        self.shell("input", "swipe", *map(str, vec), str(ms))

    def type_text(self, text: str) -> None:
        # adb needs spaces escaped as %s; strip chars `input text` can't send
        safe = text.replace(" ", "%s")
        self.shell("input", "text", safe)

    def key(self, name: str) -> None:
        self.shell("input", "keyevent", KEYCODES.get(name.upper(), name))

    # -- app lifecycle -------------------------------------------------------
    def launch(self, package: str) -> None:
        self.shell("monkey", "-p", package, "-c",
                   "android.intent.category.LAUNCHER", "1")

    def force_stop(self, package: str) -> None:
        self.shell("am", "force-stop", package)

    def clear_data(self, package: str) -> None:
        self.shell("pm", "clear", package)
