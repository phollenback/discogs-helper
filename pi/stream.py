#!/usr/bin/env python3
"""
MJPEG stream server for Raspberry Pi camera.

Run on the Pi:
    python3 stream.py

Then set in your .env:
    PICAM_STREAM_URL=http://<pi-ip>:8765/stream

Dependencies (Pi):  sudo apt install python3-picamera2
Dependencies (dev): pip install opencv-python
"""

import io
import time
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = 8765
FPS = 15
RESOLUTION = (1280, 720)
JPEG_QUALITY = 90

current_frame = None
frame_lock = threading.Lock()


def capture_loop():
    global current_frame
    try:
        from picamera2 import Picamera2
        cam = Picamera2()
        cam.configure(cam.create_video_configuration(main={"size": RESOLUTION}))
        cam.options["quality"] = JPEG_QUALITY
        cam.start()
        print("Using picamera2")
        while True:
            buf = io.BytesIO()
            cam.capture_file(buf, format="jpeg")
            with frame_lock:
                current_frame = buf.getvalue()
            time.sleep(1 / FPS)
    except ImportError:
        import cv2
        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, RESOLUTION[0])
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, RESOLUTION[1])
        print("Using OpenCV (dev mode)")
        while True:
            ok, frame = cap.read()
            if ok:
                _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
                with frame_lock:
                    current_frame = buf.tobytes()
            time.sleep(1 / FPS)


class StreamHandler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        if self.path != "/stream":
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        try:
            while True:
                with frame_lock:
                    frame = current_frame
                if frame:
                    self.wfile.write(
                        b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
                    )
                    self.wfile.flush()
                time.sleep(1 / FPS)
        except (BrokenPipeError, ConnectionResetError):
            pass


if __name__ == "__main__":
    threading.Thread(target=capture_loop, daemon=True).start()
    print("Waiting for first frame...")
    for _ in range(50):
        with frame_lock:
            if current_frame:
                break
        time.sleep(0.1)
    print(f"Stream live at http://0.0.0.0:{PORT}/stream")
    HTTPServer(("0.0.0.0", PORT), StreamHandler).serve_forever()
