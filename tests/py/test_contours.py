import pathlib
import sys
import unittest
import xml.etree.ElementTree as ET

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "tools"))
import contours  # noqa: E402

SVG = "{http://www.w3.org/2000/svg}"


class ContoursTest(unittest.TestCase):
    def test_line_count_matches_density(self):
        for density, n in contours.LINES.items():
            root = ET.fromstring(contours.generate(density, "#CDBB9E"))
            # n lines per tile plus 2 overflow lines each side for vertical tiling
            self.assertEqual(len(root.findall(f"{SVG}path")), n + 4)

    def test_density_increases(self):
        self.assertLess(contours.LINES[1], contours.LINES[2])
        self.assertLess(contours.LINES[2], contours.LINES[3])

    def test_colour_and_tiling_size(self):
        root = ET.fromstring(contours.generate(2, "#3B3A30", size=800))
        self.assertEqual(root.get("viewBox"), "0 0 800 800")
        for p in root.findall(f"{SVG}path"):
            self.assertEqual(p.get("stroke"), "#3B3A30")
            self.assertEqual(p.get("fill"), "none")

    def test_deterministic(self):
        self.assertEqual(contours.generate(3, "#000"), contours.generate(3, "#000"))

    def test_lines_start_and_end_at_tile_edges_at_same_height(self):
        # Seamless tiling needs each line to leave the right edge at the
        # height it entered the left edge.
        root = ET.fromstring(contours.generate(1, "#000", size=1000))
        for p in root.findall(f"{SVG}path"):
            nums = p.get("d").replace("M", " ").replace("L", " ").split()
            pts = list(zip(map(float, nums[0::2]), map(float, nums[1::2])))
            self.assertEqual(pts[0][0], 0.0)
            self.assertEqual(pts[-1][0], 1000.0)
            self.assertAlmostEqual(pts[0][1], pts[-1][1], places=1)


def _lines(svg):
    out = []
    for p in ET.fromstring(svg).findall(f"{SVG}path"):
        nums = p.get("d").replace("M", " ").replace("L", " ").split()
        out.append([float(y) for y in nums[1::2]])
    return out


class ContourShapeTest(unittest.TestCase):
    def test_lines_never_cross(self):
        # Real contour lines never touch; crossing lines read as generated noise.
        for density in contours.LINES:
            lines = _lines(contours.generate(density, "#000"))
            for a, b in zip(lines, lines[1:]):
                self.assertTrue(all(yb > ya + 2 for ya, yb in zip(a, b)), f"density {density} lines touch")

    def test_tiles_join_seamlessly_top_to_bottom(self):
        # The first overflow line below the tile is the first line of the next
        # tile: same shape, shifted down by exactly one tile.
        for density, n in contours.LINES.items():
            lines = _lines(contours.generate(density, "#000", size=1200))
            for k in range(2):
                for ya, yb in zip(lines[k], lines[k + n]):
                    self.assertAlmostEqual(yb - ya, 1200, places=0)


if __name__ == "__main__":
    unittest.main()
