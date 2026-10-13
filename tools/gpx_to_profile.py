#!/usr/bin/env python3
"""Turn a race GPX file into the small JSON the running scene draws.

    python3 tools/gpx_to_profile.py race.gpx -o site/data/race.json \\
        --name "Lakeland 50" --date 2026-07-25

Output points are [km, elevation_m, seconds_since_start | null, climb_so_far_m],
resampled evenly by distance. Elevation is smoothed (moving average) before the
climb is summed, so GPS jitter doesn't inflate it.
"""
import argparse
import json
import math
import pathlib
import xml.etree.ElementTree as ET
from datetime import datetime

R_KM = 6371.0088


def _local(tag):
    return tag.rsplit("}", 1)[-1]


def _child(el, name):
    for c in el:
        if _local(c.tag) == name:
            return c
    return None


def parse_gpx(text):
    # Stdlib ElementTree with no DTDs allowed: GPX never needs one, and refusing
    # them closes off entity-expansion tricks without adding a dependency.
    if "<!DOCTYPE" in text or "<!ENTITY" in text:
        raise ValueError("GPX with a DOCTYPE is not accepted")
    root = ET.fromstring(text)
    out = []
    start = None
    for el in root.iter():
        if _local(el.tag) != "trkpt":
            continue
        ele_el = _child(el, "ele")
        if ele_el is None or not (ele_el.text or "").strip():
            raise ValueError("GPX point has no elevation; export the activity with elevation data")
        t_el = _child(el, "time")
        t = None
        if t_el is not None and t_el.text:
            ts = datetime.fromisoformat(t_el.text.strip().replace("Z", "+00:00")).timestamp()
            start = ts if start is None else start
            t = ts - start
        out.append((float(el.get("lat")), float(el.get("lon")), float(ele_el.text), t))
    if not out:
        raise ValueError("GPX has no track points")
    return out


def haversine_km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R_KM * math.asin(math.sqrt(h))


def smooth(values, window):
    if window <= 1:
        return list(values)
    half = window // 2
    out = []
    for i in range(len(values)):
        lo, hi = max(0, i - half), min(len(values), i + half + 1)
        out.append(sum(values[lo:hi]) / (hi - lo))
    return out


def _interp(xs, ys, x):
    if x <= xs[0]:
        return ys[0]
    if x >= xs[-1]:
        return ys[-1]
    lo, hi = 0, len(xs) - 1
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if xs[mid] <= x:
            lo = mid
        else:
            hi = mid
    span = xs[hi] - xs[lo]
    f = (x - xs[lo]) / span if span else 0
    if ys[lo] is None or ys[hi] is None:
        return None
    return ys[lo] + f * (ys[hi] - ys[lo])


def moving_times(times, pause_s):
    """Drop stopped time: any gap longer than pause_s (an auto-paused watch at an
    aid station) counts as one normal step, so the clock only runs while moving."""
    steps = sorted(b - a for a, b in zip(times, times[1:]))
    normal = steps[len(steps) // 2] if steps else 0
    out, dropped = [times[0]], 0.0
    for a, b in zip(times, times[1:]):
        if b - a > pause_s:
            dropped += (b - a) - normal
        out.append(b - dropped)
    return out


def build_profile(trkpts, samples=400, smooth_window=5, pause_s=None, climb_m=None):
    kms = [0.0]
    for a, b in zip(trkpts, trkpts[1:]):
        kms.append(kms[-1] + haversine_km(a, b))
    eles = smooth([p[2] for p in trkpts], smooth_window)
    times = [p[3] for p in trkpts]
    if pause_s is not None and times[0] is not None:
        times = moving_times(times, pause_s)
    climbs = [0.0]
    for a, b in zip(eles, eles[1:]):
        climbs.append(climbs[-1] + max(0.0, b - a))
    if climb_m is not None and climbs[-1] > 0:
        # Match an official figure (e.g. Strava's) while keeping the profile's shape.
        climbs = [c * climb_m / climbs[-1] for c in climbs]
    total = kms[-1]
    n = max(2, samples)
    points = []
    for i in range(n):
        km = total * i / (n - 1)
        t = _interp(kms, times, km)
        points.append([
            round(km, 3),
            round(_interp(kms, eles, km), 1),
            None if t is None else int(round(t)),
            int(round(_interp(kms, climbs, km))),
        ])
    return {
        "distance_km": round(total, 2),
        "climb_m": int(round(climbs[-1])),
        "elapsed_s": None if times[-1] is None else int(round(times[-1])),
        "points": points,
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("gpx")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--date", required=True)
    ap.add_argument("--samples", type=int, default=400)
    ap.add_argument("--placeholder", action="store_true")
    ap.add_argument("--moving", action="store_true", help="show moving time (drop pauses over 30 s)")
    ap.add_argument("--climb", type=int, help="official total climb in metres, e.g. from Strava")
    ap.add_argument("--calories", type=int, help="calories burned, shown as a stat")
    args = ap.parse_args(argv)
    prof = build_profile(parse_gpx(pathlib.Path(args.gpx).read_text()), samples=args.samples,
                         pause_s=30 if args.moving else None, climb_m=args.climb)
    data = {"name": args.name, "date": args.date, "placeholder": args.placeholder,
            "time_kind": "moving" if args.moving else "elapsed", **prof}
    if args.calories is not None:
        data["calories"] = args.calories
    pathlib.Path(args.out).write_text(json.dumps(data, separators=(",", ":")))
    print(f"wrote {args.out}: {prof['distance_km']} km, {prof['climb_m']} m climb, {len(prof['points'])} points")


if __name__ == "__main__":
    main()
