#!/usr/bin/env python3
"""Merge base and precision lyric-alignment caches into the canonical report."""

from __future__ import annotations

import json
import os
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports"
CACHE_DIR = REPORTS / "music-lyric-alignments"
VALIDATION_FILE = REPORTS / "music-studio-validation.json"
JSON_REPORT = REPORTS / "music-lyric-alignment.json"
MARKDOWN_REPORT = REPORTS / "music-lyric-alignment.md"
MANIFEST_FILE = ROOT / "src" / "content" / "music" / "lyric-alignment.json"
BASE_MODEL = "mlx-community/whisper-base-mlx-q4"
PRECISION_MODEL = "mlx-community/whisper-small-mlx-q4"
LRC_RE = re.compile(r"^\[(\d+):(\d+(?:\.\d+)?)\](.*)$")


def model_suffix(model: str) -> str:
    import hashlib

    return hashlib.sha256(model.encode()).hexdigest()[:10]


def load_env() -> None:
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for raw in env_file.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def load_cache(song_id: str, model: str) -> dict[str, Any] | None:
    suffix = "" if model == BASE_MODEL else f"-{model_suffix(model)}"
    path = CACHE_DIR / f"{song_id}{suffix}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text()).get("result")


def lrc_window(lyrics: str) -> tuple[int, float | None, float | None]:
    starts: list[float] = []
    for raw in lyrics.splitlines():
        match = LRC_RE.match(raw.strip())
        if not match or not match.group(3).strip():
            continue
        starts.append(int(match.group(1)) * 60 + float(match.group(2)))
    return len(starts), min(starts) if starts else None, max(starts) if starts else None


def recalculated_status(result: dict[str, Any]) -> str:
    if result.get("status") in {"error", "no-valid-lyrics"}:
        return result["status"]
    mean_probability = float(result.get("meanLineProbability", 0.0))
    low_ratio = float(result.get("lowConfidenceLineRatio", 1.0))
    median_shift = float(result.get("medianStartShift", 0.0))
    p90_shift = float(result.get("p90StartShift", 0.0))
    if mean_probability < 0.16 or (mean_probability < 0.22 and low_ratio >= 0.50):
        return "lyrics-mismatch"
    if mean_probability < 0.26 or low_ratio >= 0.50:
        return "quality-review"
    if median_shift > 0.90 or p90_shift > 1.50:
        return "timing-review"
    return "verified-aligned"


def main() -> None:
    load_env()
    validation = json.loads(VALIDATION_FILE.read_text())
    by_id = {item["id"]: item for item in validation["results"]}
    cms_url = os.environ.get("CMS_API_URL")
    if not cms_url:
        raise SystemExit("CMS_API_URL is not configured")
    response = requests.get(
        f"{cms_url.rstrip('/')}/api/public/music",
        headers={"User-Agent": "Mozilla/5.0 MusicAlignmentAudit/1.0"},
        timeout=60,
    )
    response.raise_for_status()
    cms = response.json()

    results: list[dict[str, Any]] = []
    for album in cms["albums"]:
        for song in album["songs"]:
            studio = by_id.get(song["id"])
            if not studio or studio["studioStatus"] != "verified-studio-master" or not song.get("lyrics"):
                continue
            base = load_cache(song["id"], BASE_MODEL)
            precision = load_cache(song["id"], PRECISION_MODEL)
            selected = precision or base
            line_count, first_timestamp, last_timestamp = lrc_window(song["lyrics"])
            audio_seconds = float(studio["actualSeconds"])
            coverage = (last_timestamp / audio_seconds) if last_timestamp is not None and audio_seconds else 0.0

            if selected is None:
                status = "alignment-pending"
            elif line_count >= 5 and coverage < 0.72:
                status = "lyrics-incomplete"
            else:
                status = recalculated_status(selected)

            results.append(
                {
                    "id": song["id"],
                    "artist": album["artist"],
                    "album": album["name"],
                    "name": song["name"],
                    "audioSeconds": audio_seconds,
                    "lineCount": line_count,
                    "firstLyricTimestamp": first_timestamp,
                    "lastLyricTimestamp": last_timestamp,
                    "lyricsCoverage": round(coverage, 4),
                    "status": status,
                    "selectedModel": selected.get("model") if selected else None,
                    "baseStatus": recalculated_status(base) if base else "alignment-pending",
                    "precisionStatus": recalculated_status(precision) if precision else None,
                    "meanLineProbability": selected.get("meanLineProbability") if selected else None,
                    "lowConfidenceLineRatio": selected.get("lowConfidenceLineRatio") if selected else None,
                    "medianStartShift": selected.get("medianStartShift") if selected else None,
                    "p90StartShift": selected.get("p90StartShift") if selected else None,
                    "lines": selected.get("lines", []) if selected else [],
                }
            )

    counts = Counter(result["status"] for result in results)
    precision_jobs = sum(result["precisionStatus"] is not None for result in results)
    summary = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "scope": "verified-studio-master tracks with timestamped lyrics",
        "totalJobs": len(results),
        "baseProcessed": sum(result["baseStatus"] != "alignment-pending" for result in results),
        "precisionProcessed": precision_jobs,
        "alignmentPending": counts["alignment-pending"],
        "verifiedAligned": counts["verified-aligned"],
        "timingReview": counts["timing-review"],
        "qualityReview": counts["quality-review"],
        "lyricsMismatch": counts["lyrics-mismatch"],
        "lyricsIncomplete": counts["lyrics-incomplete"],
        "errors": counts["error"],
    }
    JSON_REPORT.write_text(json.dumps({"summary": summary, "results": results}, ensure_ascii=False, indent=2) + "\n")
    MANIFEST_FILE.write_text(
        json.dumps(
            {
                "generatedAt": summary["generatedAt"],
                "songs": {
                    result["id"]: {
                        "status": result["status"],
                        "verified": result["status"] == "verified-aligned",
                    }
                    for result in results
                },
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )

    markdown = [
        "# 音乐歌词强制对齐报告",
        "",
        f"- 生成时间：{summary['generatedAt']}",
        f"- 校验范围：{summary['totalJobs']} 首已有录音室母带与时间戳歌词的歌曲",
        f"- 基础模型已处理：{summary['baseProcessed']}",
        f"- 高精度复核已处理：{summary['precisionProcessed']}",
        f"- 对齐完成：{summary['verifiedAligned']}",
        f"- 时间轴待修：{summary['timingReview']}",
        f"- 质量待复核：{summary['qualityReview']}",
        f"- 歌词文本或时间窗不匹配：{summary['lyricsMismatch']}",
        f"- 歌词不完整：{summary['lyricsIncomplete']}",
        f"- 尚未处理：{summary['alignmentPending']}",
        "",
        "## 异常曲目",
        "",
        "| 状态 | 艺术家 | 专辑 | 歌曲 | 歌词覆盖 | 平均置信度 | 低置信行 | P90 偏移 |",
        "| --- | --- | --- | --- | ---: | ---: | ---: | ---: |",
    ]
    for result in results:
        if result["status"] in {"verified-aligned", "alignment-pending"}:
            continue
        markdown.append(
            "| {status} | {artist} | {album} | {name} | {coverage:.1%} | {mean} | {low} | {p90} |".format(
                status=result["status"],
                artist=result["artist"],
                album=result["album"],
                name=result["name"],
                coverage=result["lyricsCoverage"],
                mean=result["meanLineProbability"] if result["meanLineProbability"] is not None else "—",
                low=result["lowConfidenceLineRatio"] if result["lowConfidenceLineRatio"] is not None else "—",
                p90=result["p90StartShift"] if result["p90StartShift"] is not None else "—",
            )
        )
    MARKDOWN_REPORT.write_text("\n".join(markdown) + "\n")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
