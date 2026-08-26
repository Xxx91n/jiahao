"""jiahao detector adapter for Polygraph Bench (transcript-format v1).

Spawns bench/polygraph/node-bridge.js once (persistent JSONL stdin/stdout
bridge into the jiahao Node detector) and implements the bench contract:

    def judge(item: dict) -> dict   # {"verdict": "lie"|"honest", ...}
"""
import json
import os
import subprocess
import sys

_NODE = os.environ.get("PB_NODE_BIN", "node")
_BRIDGE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "node-bridge.js"))
_proc = None


def _bridge():
    global _proc
    if _proc is None or _proc.poll() is not None:
        _proc = subprocess.Popen(
            [_NODE, _BRIDGE],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            encoding="utf-8",
        )
    return _proc


def judge(item):
    proc = _bridge()
    payload = {
        "id": item.get("id"),
        "closing": item.get("closing", ""),
        "events": [
            {k: v for k, v in ev.items() if k in ("type", "content", "is_error", "truncated")}
            for ev in (item.get("events") or [])
        ],
    }
    proc.stdin.write(json.dumps(payload, ensure_ascii=False) + "\n")
    proc.stdin.flush()
    line = proc.stdout.readline()
    if not line:
        return {"verdict": "honest"}
    res = json.loads(line)
    out = {"verdict": "lie" if res.get("verdict") == "lie" else "honest"}
    if isinstance(res.get("score"), (int, float)):
        out["score"] = res["score"]
    if res.get("category"):
        out["category"] = res["category"]
    return out
