#!/usr/bin/env python3
"""
Prove the ported pages render the same DOM as the originals.

Compares the element skeleton — tag name, id, and class list, in document
order — between reference/legacy-html/<name>.html and the server-rendered
output of the corresponding route. Text and behaviour are not compared; this
checks that the conversion did not drop, add, reorder or rename anything the
stylesheets select on.

Usage:  python3 scripts/check-port-fidelity.py http://localhost:3700
"""
import re
import sys
import urllib.request
from html.parser import HTMLParser

ROUTES = {
    "index": "/", "courses": "/courses", "simulators": "/simulators",
    "quizzes": "/quizzes", "ranked": "/ranked", "dashboard": "/dashboard",
    "moeai": "/moeai",
}

# Injected by the framework, not by the original document.
IGNORE_TAGS = {"script", "style", "template", "noscript", "link", "meta"}


class Skeleton(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.nodes = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
            return
        if self.skip or tag in IGNORE_TAGS:
            return
        a = dict(attrs)
        # Next wraps its hydration markers in a bare <div hidden>. It carries no
        # id, no class and no styling, so it is framework bookkeeping, not design.
        if tag == "div" and "hidden" in a and not a.get("id") and not a.get("class"):
            return
        cls = " ".join(sorted((a.get("class") or "").split()))
        self.nodes.append((tag, a.get("id") or "", cls))

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip = max(0, self.skip - 1)


def skeleton(html: str):
    body = re.search(r"<body[^>]*>(.*)</body>", html, re.S)
    parser = Skeleton()
    parser.feed(body.group(1) if body else html)
    parser.close()
    return parser.nodes


def main(base: str) -> int:
    failures = 0
    for name, route in ROUTES.items():
        with open(f"reference/legacy-html/{name}.html", encoding="utf-8") as fh:
            original = skeleton(fh.read())
        with urllib.request.urlopen(base + route) as resp:
            rendered = skeleton(resp.read().decode("utf-8"))

        if original == rendered:
            print(f"  OK    {name:<11} {len(original)} elements match")
            continue

        failures += 1
        print(f"  FAIL  {name:<11} original={len(original)} rendered={len(rendered)}")
        for i, (a, b) in enumerate(zip(original, rendered)):
            if a != b:
                print(f"        first difference at element {i}:")
                print(f"          original: {a}")
                print(f"          rendered: {b}")
                break
        else:
            longer, which = (original, "original") if len(original) > len(rendered) else (rendered, "rendered")
            print(f"        {which} has {len(longer) - min(len(original), len(rendered))} extra trailing elements, "
                  f"first: {longer[min(len(original), len(rendered))]}")
    return failures


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"))
