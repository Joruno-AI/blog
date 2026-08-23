#!/usr/bin/env python3
"""Validate timestamped lyrics against verified studio audio without mutating CMS data."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import statistics
import tempfile
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
import stable_whisper


ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports"
CACHE_DIR = REPORTS / "music-lyric-alignments"
VALIDATION_FILE = REPORTS / "music-studio-validation.json"
PROGRESS_FILE = REPORTS / "music-lyric-alignment-progress.json"
JSON_REPORT = REPORTS / "music-lyric-alignment.json"
MARKDOWN_REPORT = REPORTS / "music-lyric-alignment.md"
MODEL_NAME = "mlx-community/whisper-base-mlx-q4"
SCRIPT_VERSION = 1
USER_AGENT = "Mozilla/5.0 MusicAlignmentAudit/1.0"
LRC_RE = re.compile(r"^\[(\d+):(\d+(?:\.\d+)?)\](.*)$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--model", default=MODEL_NAME)
    parser.add_argument("--song-id", action="append", default=[])
    parser.add_argument("--shard-count", type=int, default=1)
    parser.add_argument("--shard-index", type=int, default=0)
    parser.add_argument("--worker", action="store_true", help="Skip shared progress/final report writes")
    parser.add_argument(
        "--recheck-base",
        action="store_true",
        help="Run only borderline base-model results that need the precision model",
    )
    return parser.parse_args()


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


def fetch_json(url: str) -> dict[str, Any]:
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=60)
    response.raise_for_status()
    return response.json()


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def percentile(values: list[float], fraction: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, math.ceil(len(ordered) * fraction) - 1))
    return ordered[index]


def round_or_none(value: float | None, digits: int = 4) -> float | None:
    return None if value is None else round(value, digits)


def parse_lrc(lyrics: str, audio_seconds: float) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for raw in lyrics.splitlines():
        match = LRC_RE.match(raw.strip())
        if not match:
            continue
        text = match.group(3).strip()
        if not text:
            continue
        start = int(match.group(1)) * 60 + float(match.group(2))
        rows.append({"start": start, "text": text})

    rows.sort(key=lambda row: row["start"])
    deduplicated: list[dict[str, Any]] = []
    for row in rows:
        if deduplicated and abs(row["start"] - deduplicated[-1]["start"]) < 0.01:
            deduplicated[-1]["text"] = f"{deduplicated[-1]['text']} {row['text']}"
            continue
        deduplicated.append(row)
    rows = deduplicated
    segments: list[dict[str, Any]] = []
    for index, row in enumerate(rows):
        next_start = rows[index + 1]["start"] if index + 1 < len(rows) else audio_seconds
        end = min(audio_seconds, next_start, row["start"] + 15.0)
        if end - row["start"] < 0.02:
            continue
        segments.append(
            {"start": round(row["start"], 3), "end": round(end, 3), "text": row["text"]}
        )
    return segments


def lyrics_coverage(lyrics: str, audio_seconds: float) -> float:
    starts = [segment["start"] for segment in parse_lrc(lyrics, audio_seconds)]
    return max(starts, default=0.0) / audio_seconds if audio_seconds else 0.0


def cache_key(job: dict[str, Any], model_name: str) -> str:
    material = json.dumps(
        {
            "version": SCRIPT_VERSION,
            "model": model_name,
            "url": job["url"],
            "lyrics": job["lyrics"],
            "actualSeconds": job["actualSeconds"],
        },
        ensure_ascii=False,
        sort_keys=True,
    )
    return sha256_text(material)


def classify(mean_probability: float, low_line_ratio: float, median_shift: float, p90_shift: float) -> str:
    if mean_probability < 0.22 or low_line_ratio >= 0.45:
        return "text-mismatch"
    if mean_probability < 0.30 or low_line_ratio >= 0.25:
        return "quality-review"
    if median_shift > 0.9 or p90_shift > 1.5:
        return "timing-review"
    return "verified-aligned"


def download_audio(url: str, target: Path) -> None:
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=120, stream=True) as response:
                response.raise_for_status()
                with target.open("wb") as output:
                    for chunk in response.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            output.write(chunk)
            return
        except (requests.RequestException, OSError) as error:
            last_error = error
            target.unlink(missing_ok=True)
            if attempt < 2:
                time.sleep(2**attempt)
    assert last_error is not None
    raise last_error


def align_job(model: Any, job: dict[str, Any], model_name: str) -> dict[str, Any]:
    segments = parse_lrc(job["lyrics"], job["actualSeconds"])
    if not segments:
        return {
            **{key: job[key] for key in ("id", "artist", "album", "name", "url")},
            "lyricsHash": sha256_text(job["lyrics"]),
            "model": model_name,
            "status": "no-valid-lyrics",
            "lineCount": 0,
            "lines": [],
        }

    started = time.monotonic()
    with tempfile.TemporaryDirectory(prefix="music-align-") as temp_dir:
        audio_path = Path(temp_dir) / "audio.mp3"
        download_audio(job["url"], audio_path)
        result = model.align_words(
            str(audio_path),
            segments,
            "zh",
            verbose=None,
            suppress_silence=True,
            regroup=False,
        ).to_dict()

    lines: list[dict[str, Any]] = []
    for original, aligned in zip(segments, result.get("segments", []), strict=False):
        words = aligned.get("words") or []
        probabilities = [float(word["probability"]) for word in words if word.get("probability") is not None]
        aligned_start = float(aligned.get("start", original["start"]))
        aligned_end = float(aligned.get("end", original["end"]))
        lines.append(
            {
                "text": original["text"],
                "originalStart": original["start"],
                "originalEnd": original["end"],
                "alignedStart": round(aligned_start, 3),
                "alignedEnd": round(aligned_end, 3),
                "startShift": round(aligned_start - original["start"], 3),
                "wordCount": len(words),
                "meanProbability": round_or_none(statistics.mean(probabilities) if probabilities else None),
                "minProbability": round_or_none(min(probabilities) if probabilities else None),
            }
        )

    line_means = [line["meanProbability"] for line in lines if line["meanProbability"] is not None]
    shifts = [max(0.0, float(line["startShift"])) for line in lines]
    mean_probability = statistics.mean(line_means) if line_means else 0.0
    low_line_ratio = sum(value < 0.20 for value in line_means) / len(line_means) if line_means else 1.0
    median_shift = statistics.median(shifts) if shifts else 0.0
    p90_shift = percentile(shifts, 0.9) or 0.0
    status = classify(mean_probability, low_line_ratio, median_shift, p90_shift)

    return {
        **{key: job[key] for key in ("id", "artist", "album", "name", "url")},
        "lyricsHash": sha256_text(job["lyrics"]),
        "model": model_name,
        "status": status,
        "lineCount": len(lines),
        "meanLineProbability": round(mean_probability, 4),
        "lowConfidenceLineRatio": round(low_line_ratio, 4),
        "medianStartShift": round(median_shift, 3),
        "p90StartShift": round(p90_shift, 3),
        "maxStartShift": round(max(shifts) if shifts else 0.0, 3),
        "processingSeconds": round(time.monotonic() - started, 2),
        "lines": lines,
    }


def make_summary(results: list[dict[str, Any]], total_jobs: int, model_name: str) -> dict[str, Any]:
    counts = Counter(result["status"] for result in results)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "model": model_name,
        "scope": "verified-studio-master tracks with timestamped lyrics",
        "totalJobs": total_jobs,
        "processed": len(results),
        "remaining": max(0, total_jobs - len(results)),
        "verifiedAligned": counts["verified-aligned"],
        "timingReview": counts["timing-review"],
        "qualityReview": counts["quality-review"],
        "textMismatch": counts["text-mismatch"],
        "noValidLyrics": counts["no-valid-lyrics"],
        "errors": counts["error"],
    }


def write_progress(results: list[dict[str, Any]], total_jobs: int, model_name: str) -> None:
    payload = {"summary": make_summary(results, total_jobs, model_name), "results": results}
    PROGRESS_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def write_final(results: list[dict[str, Any]], total_jobs: int, model_name: str) -> None:
    summary = make_summary(results, total_jobs, model_name)
    payload = {"summary": summary, "results": results}
    JSON_REPORT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")

    lines = [
        "# 音乐歌词强制对齐报告",
        "",
        f"- 生成时间：{summary['generatedAt']}",
        f"- 模型：`{model_name}`",
        f"- 范围：{summary['scope']}",
        f"- 已处理：{summary['processed']} / {summary['totalJobs']}",
        f"- 完成对齐：{summary['verifiedAligned']}",
        f"- 时间轴待复核：{summary['timingReview']}",
        f"- 质量待复核：{summary['qualityReview']}",
        f"- 文本疑似不匹配：{summary['textMismatch']}",
        f"- 无有效歌词：{summary['noValidLyrics']}",
        f"- 错误：{summary['errors']}",
        "",
        "## 需要处理的曲目",
        "",
        "| 状态 | 艺术家 | 专辑 | 歌曲 | 平均置信度 | 低置信行 | 中位偏移 | P90 偏移 |",
        "| --- | --- | --- | --- | ---: | ---: | ---: | ---: |",
    ]
    for result in results:
        if result["status"] == "verified-aligned":
            continue
        lines.append(
            "| {status} | {artist} | {album} | {name} | {confidence} | {low} | {median} | {p90} |".format(
                status=result["status"],
                artist=result["artist"],
                album=result["album"],
                name=result["name"],
                confidence=result.get("meanLineProbability", "—"),
                low=result.get("lowConfidenceLineRatio", "—"),
                median=result.get("medianStartShift", "—"),
                p90=result.get("p90StartShift", "—"),
            )
        )
    MARKDOWN_REPORT.write_text("\n".join(lines) + "\n")


def main() -> None:
    args = parse_args()
    load_env()
    cms_url = os.environ.get("CMS_API_URL")
    if not cms_url:
        raise SystemExit("CMS_API_URL is not configured")

    REPORTS.mkdir(exist_ok=True)
    CACHE_DIR.mkdir(exist_ok=True)
    validation = json.loads(VALIDATION_FILE.read_text())
    studio_by_id = {item["id"]: item for item in validation["results"]}
    cms = fetch_json(f"{cms_url.rstrip('/')}/api/public/music")

    jobs: list[dict[str, Any]] = []
    selected_ids = set(args.song_id)
    for album in cms["albums"]:
        for song in album["songs"]:
            studio = studio_by_id.get(song["id"])
            if not studio or studio["studioStatus"] != "verified-studio-master":
                continue
            if not song.get("lyrics") or not song.get("url"):
                continue
            if selected_ids and song["id"] not in selected_ids:
                continue
            jobs.append(
                {
                    "id": song["id"],
                    "artist": album["artist"],
                    "album": album["name"],
                    "name": song["name"],
                    "url": song["url"],
                    "lyrics": song["lyrics"],
                    "actualSeconds": float(studio["actualSeconds"]),
                }
            )

    if args.recheck_base:
        recheck_jobs: list[dict[str, Any]] = []
        for job in jobs:
            base_cache = CACHE_DIR / f"{job['id']}.json"
            if not base_cache.exists():
                continue
            base = json.loads(base_cache.read_text()).get("result", {})
            mean_probability = float(base.get("meanLineProbability", 0.0))
            low_ratio = float(base.get("lowConfidenceLineRatio", 1.0))
            median_shift = float(base.get("medianStartShift", 0.0))
            p90_shift = float(base.get("p90StartShift", 0.0))
            coverage = lyrics_coverage(job["lyrics"], job["actualSeconds"])
            strong_mismatch = mean_probability < 0.16 or (
                mean_probability < 0.22 and low_ratio >= 0.50
            )
            borderline = (
                mean_probability < 0.26
                or low_ratio >= 0.50
                or median_shift > 0.90
                or p90_shift > 1.50
            )
            if (
                base.get("status") != "verified-aligned"
                and borderline
                and not strong_mismatch
                and low_ratio < 0.75
                and coverage >= 0.72
            ):
                recheck_jobs.append(job)
        jobs = recheck_jobs

    if args.limit:
        jobs = jobs[: args.limit]
    if args.shard_count < 1 or not 0 <= args.shard_index < args.shard_count:
        raise SystemExit("Invalid shard index/count")
    if args.shard_count > 1:
        jobs = [job for index, job in enumerate(jobs) if index % args.shard_count == args.shard_index]
    total_jobs = len(jobs)
    print(f"歌词对齐任务：{total_jobs} 首；模型：{args.model}", flush=True)

    results: list[dict[str, Any]] = []
    pending: list[tuple[dict[str, Any], Path, str]] = []
    for job in jobs:
        key = cache_key(job, args.model)
        model_suffix = "" if args.model == MODEL_NAME else f"-{sha256_text(args.model)[:10]}"
        cache_file = CACHE_DIR / f"{job['id']}{model_suffix}.json"
        if cache_file.exists() and not args.force:
            cached = json.loads(cache_file.read_text())
            if cached.get("cacheKey") == key and cached.get("result", {}).get("status") != "error":
                results.append(cached["result"])
                continue
        pending.append((job, cache_file, key))

    print(f"缓存命中：{len(results)}；需要运行：{len(pending)}", flush=True)
    model = stable_whisper.load_mlx_whisper(args.model) if pending else None
    completed = len(results)
    for job, cache_file, key in pending:
        started = time.monotonic()
        try:
            result = align_job(model, job, args.model)
        except Exception as error:  # keep the batch resumable
            result = {
                **{name: job[name] for name in ("id", "artist", "album", "name", "url")},
                "lyricsHash": sha256_text(job["lyrics"]),
                "model": args.model,
                "status": "error",
                "error": f"{type(error).__name__}: {error}",
                "processingSeconds": round(time.monotonic() - started, 2),
                "lines": [],
            }
        cache_file.write_text(
            json.dumps({"cacheKey": key, "result": result}, ensure_ascii=False, indent=2) + "\n"
        )
        results.append(result)
        completed += 1
        if not args.worker:
            write_progress(results, total_jobs, args.model)
        print(
            f"[{completed}/{total_jobs}] {job['artist']} · {job['name']} -> {result['status']} "
            f"({result.get('processingSeconds', 0):.1f}s)",
            flush=True,
        )

    order = {job["id"]: index for index, job in enumerate(jobs)}
    results.sort(key=lambda result: order[result["id"]])
    if not args.worker:
        write_progress(results, total_jobs, args.model)
        write_final(results, total_jobs, args.model)
    print(json.dumps(make_summary(results, total_jobs, args.model), ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
