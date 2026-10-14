#!/usr/bin/env python3
"""Static server for the Playwright tests: python3 tools/serve.py [port]

The stock `python3 -m http.server` listens with a backlog of 5. With two test
browsers each opening ~35 files at once, the kernel drops connections past
that, and TCP's retry backoff (1s, 2s, 4s, 8s) can stall a module script for
over 15 seconds, so a page never boots. A deep backlog removes that.
"""
import functools
import http.server
import pathlib
import sys


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    site = pathlib.Path(__file__).resolve().parent.parent / "site"
    handler = functools.partial(Quiet, directory=str(site))
    with Server(("127.0.0.1", port), handler) as s:
        s.serve_forever()


if __name__ == "__main__":
    main()
