#!/usr/bin/env python3
"""
Grailmeter turntable detector.

Reads MJPEG frames from stream.py, detects record presence and platter
spin state, and posts state changes to the API.

States:
  idle     → no record on platter     (vinyl-removed)
  stopped  → record present, still    (vinyl-detected)
  spinning → platter spinning          (platter-start)

Run after stream.py is up:
    python3 pi/detect.py

Debug overlay (tune thresholds visually):
    python3 pi/detect.py --show

Dependencies: pip install opencv-python-headless requests numpy
  (or: sudo apt install python3-opencv python3-requests python3-numpy)
"""

import cv2
import numpy as np
import requests
import time
import logging
import signal
import sys

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

# ── CONFIG ────────────────────────────────────────────────────────────────────
# Tune these to match your camera placement.
# Run with --show to see the ROI overlay and live brightness/motion values.

STREAM_URL = "http://localhost:8765/stream"
API_BASE   = "http://localhost:3001/api/grailmeter"
USER_ID    = 1

# Platter ROI — pixels in a 1280×720 frame.
# CX, CY = center of the platter in the frame.
# R_LABEL  = inner exclusion radius (avoids the label area jitter).
# R_RECORD = outer radius at the record edge.
CX, CY   = 640, 360
R_LABEL  = 90
R_RECORD = 290

# Detection thresholds.
# RECORD_BRIGHTNESS: mean grayscale of platter circle — below this = record present.
#   Vinyl is dark (~20-40); bare platter/mat tends lighter. Tune if needed.
RECORD_BRIGHTNESS = 60

# SPIN_THRESH: mean absolute frame-diff in groove annulus — above this = motion.
#   Increase if detecting false motion (vibration/lighting), decrease if missing spin.
SPIN_THRESH = 3.5

# Confirmation frame counts — higher = more stable, slower to react.
RECORD_CONFIRM = 8
IDLE_CONFIRM   = 14
SPIN_CONFIRM   = 6
STOP_CONFIRM   = 22

# ── MJPEG READER ─────────────────────────────────────────────────────────────

def iter_frames(url):
    """Yield BGR frames from an MJPEG stream, reconnecting on failure."""
    while True:
        try:
            with requests.get(url, stream=True, timeout=15) as r:
                buf = b""
                for chunk in r.iter_content(chunk_size=4096):
                    buf += chunk
                    while True:
                        s = buf.find(b"\xff\xd8")
                        e = buf.find(b"\xff\xd9", s + 1)
                        if s == -1 or e == -1:
                            break
                        jpg = buf[s : e + 2]
                        buf = buf[e + 2 :]
                        frame = cv2.imdecode(np.frombuffer(jpg, np.uint8), cv2.IMREAD_COLOR)
                        if frame is not None:
                            yield frame
        except Exception as exc:
            log.warning(f"Stream error ({exc}) — retrying in 3s")
            time.sleep(3)


# ── ROI MASKS ─────────────────────────────────────────────────────────────────

_masks = {}  # cached per (h, w)

def get_masks(h, w):
    if (h, w) not in _masks:
        annulus = np.zeros((h, w), np.uint8)
        cv2.circle(annulus, (CX, CY), R_RECORD, 255, -1)
        cv2.circle(annulus, (CX, CY), R_LABEL,  0,   -1)

        platter = np.zeros((h, w), np.uint8)
        cv2.circle(platter, (CX, CY), R_RECORD, 255, -1)

        _masks[(h, w)] = (annulus, platter)
    return _masks[(h, w)]


# ── API ───────────────────────────────────────────────────────────────────────

def post(endpoint):
    try:
        r = requests.post(f"{API_BASE}/{endpoint}", json={"user_id": USER_ID}, timeout=5)
        log.info(f"POST /{endpoint} → {r.status_code}")
    except Exception as exc:
        log.warning(f"API call failed ({exc})")


# ── STATE MACHINE ─────────────────────────────────────────────────────────────

class Detector:
    IDLE     = "idle"
    STOPPED  = "stopped"
    SPINNING = "spinning"

    def __init__(self):
        self.state      = self.IDLE
        self.prev_gray  = None
        self.dark_buf   = 0
        self.bright_buf = 0
        self.motion_buf = 0
        self.still_buf  = 0

    def step(self, frame):
        h, w = frame.shape[:2]
        annulus, platter = get_masks(h, w)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Record presence: mean brightness of the platter circle.
        brightness = float(gray[platter > 0].mean())
        record_present = brightness < RECORD_BRIGHTNESS

        # Spinning: mean abs diff in groove annulus between consecutive frames.
        motion = 0.0
        if self.prev_gray is not None:
            diff = cv2.absdiff(gray, self.prev_gray)
            motion = float(diff[annulus > 0].mean())
        self.prev_gray = gray

        # Counters.
        if record_present:
            self.dark_buf   = min(self.dark_buf + 1, 200)
            self.bright_buf = 0
        else:
            self.bright_buf = min(self.bright_buf + 1, 200)
            self.dark_buf   = 0

        if motion > SPIN_THRESH:
            self.motion_buf = min(self.motion_buf + 1, 200)
            self.still_buf  = 0
        else:
            self.still_buf  = min(self.still_buf + 1, 200)
            self.motion_buf = 0

        # Transitions.
        new_state = self.state

        if self.state == self.IDLE:
            if self.dark_buf >= RECORD_CONFIRM:
                new_state = self.STOPPED

        elif self.state == self.STOPPED:
            if self.bright_buf >= IDLE_CONFIRM:
                new_state = self.IDLE
            elif self.motion_buf >= SPIN_CONFIRM:
                new_state = self.SPINNING

        elif self.state == self.SPINNING:
            if self.bright_buf >= IDLE_CONFIRM:
                new_state = self.IDLE
            elif self.still_buf >= STOP_CONFIRM:
                new_state = self.STOPPED

        if new_state != self.state:
            self._on_transition(self.state, new_state)
            self.state = new_state

        return self.state, brightness, motion

    def _on_transition(self, old, new):
        log.info(f"  {old.upper()} → {new.upper()}")
        if new == self.STOPPED and old == self.IDLE:
            post("vinyl-detected")
        elif new == self.SPINNING:
            if old == self.IDLE:
                post("vinyl-detected")
            post("platter-start")
        elif new == self.STOPPED and old == self.SPINNING:
            post("platter-stop")
        elif new == self.IDLE:
            post("vinyl-removed")


# ── MAIN ──────────────────────────────────────────────────────────────────────

def startup_reset():
    log.info("Startup reset: closing any stale sessions from previous run …")
    post("vinyl-removed")


def _shutdown(signum, frame):
    log.info(f"Signal {signum} received — cleaning up and exiting")
    post("vinyl-removed")
    sys.exit(0)


if __name__ == "__main__":
    show = "--show" in sys.argv

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT,  _shutdown)

    log.info(f"Connecting to {STREAM_URL}")
    log.info(f"Platter ROI: center=({CX},{CY})  inner_r={R_LABEL}  outer_r={R_RECORD}")
    log.info(f"Thresholds: brightness<{RECORD_BRIGHTNESS} → record  motion>{SPIN_THRESH} → spinning")

    startup_reset()

    det = Detector()
    for frame in iter_frames(STREAM_URL):
        state, brightness, motion = det.step(frame)

        if show:
            vis = frame.copy()
            cv2.circle(vis, (CX, CY), R_RECORD, (0, 255, 0), 2)
            cv2.circle(vis, (CX, CY), R_LABEL,  (0, 200, 255), 2)
            cv2.circle(vis, (CX, CY), 4,         (255, 255, 255), -1)
            label = f"{state.upper()}   brightness={brightness:.1f}  motion={motion:.2f}"
            cv2.putText(vis, label, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
            cv2.imshow("Grailmeter Detector", vis)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                post("vinyl-removed")
                break
