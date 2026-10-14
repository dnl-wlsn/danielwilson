import json
import pathlib
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
import gpx_to_profile as g  # noqa: E402


def gpx(points, ns=True):
    xmlns = ' xmlns="http://www.topografix.com/GPX/1/1"' if ns else ""
    pts = "".join(
        f'<trkpt lat="{lat}" lon="{lon}">' + (f"<ele>{ele}</ele>" if ele is not None else "")
        + (f"<time>{t}</time>" if t else "") + "</trkpt>"
        for lat, lon, ele, t in points)
    return f'<?xml version="1.0"?><gpx version="1.1"{xmlns}><trk><trkseg>{pts}</trkseg></trk></gpx>'


FOUR = [
    (0.00, 0, 100, "2026-05-01T08:00:00Z"),
    (0.01, 0, 150, "2026-05-01T08:10:00Z"),
    (0.02, 0, 120, "2026-05-01T08:20:00Z"),
    (0.03, 0, 200, "2026-05-01T08:30:00Z"),
]


class GpxTest(unittest.TestCase):
    def test_parse_with_and_without_namespace(self):
        for ns in (True, False):
            pts = g.parse_gpx(gpx(FOUR, ns))
            self.assertEqual(len(pts), 4)
            self.assertEqual(pts[1][2], 150.0)
            self.assertEqual(pts[3][3], 1800.0)

    def test_distance_is_haversine(self):
        p = g.build_profile(g.parse_gpx(gpx(FOUR)), samples=4, smooth_window=1)
        self.assertAlmostEqual(p["distance_km"], 3.34, places=2)

    def test_climb_sums_only_rises(self):
        p = g.build_profile(g.parse_gpx(gpx(FOUR)), samples=4, smooth_window=1)
        self.assertEqual(p["climb_m"], 130)
        self.assertEqual(p["points"][-1][3], 130)

    def test_elapsed_and_resample_count(self):
        p = g.build_profile(g.parse_gpx(gpx(FOUR)), samples=10, smooth_window=1)
        self.assertEqual(p["elapsed_s"], 1800)
        self.assertEqual(len(p["points"]), 10)
        self.assertEqual(p["points"][0][0], 0)
        self.assertAlmostEqual(p["points"][-1][0], p["distance_km"], places=2)

    def test_points_never_go_backwards(self):
        p = g.build_profile(g.parse_gpx(gpx(FOUR)), samples=50, smooth_window=3)
        kms = [pt[0] for pt in p["points"]]
        self.assertEqual(kms, sorted(kms))
        climbs = [pt[3] for pt in p["points"]]
        self.assertEqual(climbs, sorted(climbs))

    def test_missing_times_give_null(self):
        pts = [(lat, lon, ele, None) for lat, lon, ele, _ in FOUR]
        p = g.build_profile(g.parse_gpx(gpx(pts)), samples=4, smooth_window=1)
        self.assertIsNone(p["elapsed_s"])
        self.assertIsNone(p["points"][1][2])

    def test_missing_elevation_is_an_error(self):
        pts = [(lat, lon, None, t) for lat, lon, _, t in FOUR]
        with self.assertRaisesRegex(ValueError, "elevation"):
            g.parse_gpx(gpx(pts))

    def test_doctype_is_refused(self):
        evil = '<?xml version="1.0"?><!DOCTYPE g [<!ENTITY a "aaaa">]><gpx/>'
        with self.assertRaisesRegex(ValueError, "DOCTYPE"):
            g.parse_gpx(evil)

    def test_empty_is_an_error(self):
        with self.assertRaisesRegex(ValueError, "no track points"):
            g.parse_gpx(gpx([]))

    def test_cli_writes_json(self):
        with tempfile.TemporaryDirectory() as d:
            src = pathlib.Path(d) / "in.gpx"
            out = pathlib.Path(d) / "race.json"
            src.write_text(gpx(FOUR))
            subprocess.run([sys.executable, str(ROOT / "tools/gpx_to_profile.py"), str(src), "-o", str(out),
                            "--name", "Test", "--date", "2026-05-01", "--placeholder"], check=True)
            data = json.loads(out.read_text())
            self.assertEqual(data["name"], "Test")
            self.assertTrue(data["placeholder"])
            self.assertIn("points", data)


PAUSED = [
    (0.00, 0, 100, "2026-05-01T08:00:00Z"),
    (0.01, 0, 150, "2026-05-01T08:10:00Z"),
    (0.02, 0, 120, "2026-05-01T08:50:00Z"),  # watch stopped for 30 min at an aid station
    (0.03, 0, 200, "2026-05-01T09:00:00Z"),
]


class MovingTimeAndOverridesTest(unittest.TestCase):
    def test_moving_time_drops_pauses(self):
        p = g.build_profile(g.parse_gpx(gpx(PAUSED)), samples=4, smooth_window=1, pause_s=1200)
        # 60 min elapsed, minus the 40 min gap, keeping one normal 10 min step
        self.assertEqual(p["elapsed_s"], 1800)
        self.assertEqual(p["points"][2][2], 1200)

    def test_without_pause_threshold_time_is_elapsed(self):
        p = g.build_profile(g.parse_gpx(gpx(PAUSED)), samples=4, smooth_window=1)
        self.assertEqual(p["elapsed_s"], 3600)

    def test_climb_override_scales_the_running_total(self):
        p = g.build_profile(g.parse_gpx(gpx(FOUR)), samples=4, smooth_window=1, climb_m=1058)
        self.assertEqual(p["climb_m"], 1058)
        self.assertEqual(p["points"][-1][3], 1058)
        self.assertEqual(p["points"][1][3], round(50 * 1058 / 130))

    def test_time_override_finishes_on_the_official_figure(self):
        # Strava's moving time can differ from anything the GPX shows (GPS gaps
        # it counts as moving), so an official figure wins.
        p = g.build_profile(g.parse_gpx(gpx(PAUSED)), samples=4, smooth_window=1, time_s=3000)
        self.assertEqual(p["elapsed_s"], 3000)
        self.assertEqual(p["points"][-1][2], 3000)
        self.assertEqual(p["points"][1][2], round(600 * 3000 / 3600))

    def test_cli_time_override(self):
        with tempfile.TemporaryDirectory() as d:
            src = pathlib.Path(d) / "in.gpx"
            out = pathlib.Path(d) / "race.json"
            src.write_text(gpx(PAUSED))
            subprocess.run([sys.executable, str(ROOT / "tools/gpx_to_profile.py"), str(src), "-o", str(out),
                            "--name", "Test", "--date", "2026-05-01", "--time", "7:16:59"], check=True)
            data = json.loads(out.read_text())
            self.assertEqual(data["elapsed_s"], 26219)
            self.assertEqual(data["time_kind"], "moving")

    def test_cli_moving_climb_and_calories(self):
        with tempfile.TemporaryDirectory() as d:
            src = pathlib.Path(d) / "in.gpx"
            out = pathlib.Path(d) / "race.json"
            src.write_text(gpx(PAUSED))
            subprocess.run([sys.executable, str(ROOT / "tools/gpx_to_profile.py"), str(src), "-o", str(out),
                            "--name", "Test", "--date", "2026-05-01", "--moving", "--climb", "1058",
                            "--calories", "5944"], check=True)
            data = json.loads(out.read_text())
            self.assertEqual(data["time_kind"], "moving")
            self.assertEqual(data["climb_m"], 1058)
            self.assertEqual(data["calories"], 5944)
            self.assertFalse(data["placeholder"])


if __name__ == "__main__":
    unittest.main()


class PlannedRouteTest(unittest.TestCase):
    """A course file from the organiser has no timestamps: spread the time, scale the distance."""

    def test_route_without_times_gets_even_times_and_official_distance(self):
        pts = [(51.5, -0.1 + i * 0.01, 100.0 + (i % 3), None) for i in range(50)]
        prof = g.build_profile(pts, samples=11, time_s=3600, distance_km=40.0)
        self.assertEqual(prof["distance_km"], 40.0)
        self.assertEqual(prof["elapsed_s"], 3600)
        self.assertEqual(prof["points"][5][2], 1800)
        self.assertAlmostEqual(prof["points"][5][0], 20.0, places=2)
