#!/usr/bin/env python3
"""
Mechanically convert the original single-file pages in reference/legacy-html/
into Next.js routes.

This is a CONVERTER, not a redesign. The rules it follows:

  - CSS is copied byte-for-byte into <route>/legacy.css. Nothing is retyped,
    so the design cannot drift.
  - The page script is copied byte-for-byte into public/legacy/<name>.js and
    loaded as a classic script, so it runs in global scope exactly as it did
    when it sat at the bottom of the original <body>.
  - Markup is converted HTML -> JSX structurally (via a real parser, not
    regexes): attribute renames, void elements self-closed, inline style
    strings turned into objects, inline handlers preserved through a helper
    that reproduces their original `this`/`event` semantics.

Re-run it any time reference/legacy-html/ changes.
"""
import html
import json
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEGACY = os.path.join(ROOT, "reference", "legacy-html")

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr"}

# HTML attribute -> JSX property. Anything not listed (data-*, aria-*, and the
# many already-correct ones) passes through unchanged.
ATTR_MAP = {
    "class": "className", "for": "htmlFor", "tabindex": "tabIndex",
    "colspan": "colSpan", "rowspan": "rowSpan", "maxlength": "maxLength",
    "minlength": "minLength", "readonly": "readOnly", "autocomplete": "autoComplete",
    "autofocus": "autoFocus", "spellcheck": "spellCheck", "contenteditable": "contentEditable",
    "novalidate": "noValidate", "enterkeyhint": "enterKeyHint", "inputmode": "inputMode",
    "crossorigin": "crossOrigin", "srcset": "srcSet", "datetime": "dateTime",
    "accesskey": "accessKey", "frameborder": "frameBorder", "allowfullscreen": "allowFullScreen",
    "usemap": "useMap", "cellpadding": "cellPadding", "cellspacing": "cellSpacing",
    "marginwidth": "marginWidth", "marginheight": "marginHeight",
    "playsinline": "playsInline", "srclang": "srcLang", "http-equiv": "httpEquiv",
    # SVG presentation attributes
    "stroke-width": "strokeWidth", "stroke-linecap": "strokeLinecap",
    "stroke-linejoin": "strokeLinejoin", "stroke-dasharray": "strokeDasharray",
    "stroke-dashoffset": "strokeDashoffset", "stroke-opacity": "strokeOpacity",
    "fill-rule": "fillRule", "fill-opacity": "fillOpacity", "clip-rule": "clipRule",
    "clip-path": "clipPath", "stop-color": "stopColor", "stop-opacity": "stopOpacity",
    "text-anchor": "textAnchor", "font-size": "fontSize", "font-family": "fontFamily",
    "font-weight": "fontWeight", "letter-spacing": "letterSpacing",
    "xlink:href": "xlinkHref", "xml:space": "xmlSpace",
    "vector-effect": "vectorEffect", "shape-rendering": "shapeRendering",
    "viewbox": "viewBox", "preserveaspectratio": "preserveAspectRatio",
    "gradientunits": "gradientUnits", "gradienttransform": "gradientTransform",
    "patternunits": "patternUnits", "spreadmethod": "spreadMethod",
    "baseprofile": "baseProfile", "markerwidth": "markerWidth",
    "markerheight": "markerHeight", "refx": "refX", "refy": "refY",
    "dominant-baseline": "dominantBaseline",
}

# Attributes that are booleans in HTML: bare presence means true.
# React's event props are camelCased in ways a simple capitalise cannot guess
# ("onkeydown" -> "onKeyDown", not "onKeydown").
EVENT_MAP = {
    "onclick": "onClick", "ondblclick": "onDoubleClick", "onchange": "onChange",
    "oninput": "onInput", "onsubmit": "onSubmit", "onreset": "onReset",
    "onfocus": "onFocus", "onblur": "onBlur", "onerror": "onError",
    "onload": "onLoad", "onkeydown": "onKeyDown", "onkeyup": "onKeyUp",
    "onkeypress": "onKeyPress", "onmousedown": "onMouseDown", "onmouseup": "onMouseUp",
    "onmouseover": "onMouseOver", "onmouseout": "onMouseOut", "onmousemove": "onMouseMove",
    "onmouseenter": "onMouseEnter", "onmouseleave": "onMouseLeave",
    "ontouchstart": "onTouchStart", "ontouchend": "onTouchEnd", "ontouchmove": "onTouchMove",
    "onscroll": "onScroll", "onwheel": "onWheel", "oncontextmenu": "onContextMenu",
    "ondragstart": "onDragStart", "ondragover": "onDragOver", "ondrop": "onDrop",
    "onpaste": "onPaste", "oncopy": "onCopy", "oncut": "onCut",
    "onplay": "onPlay", "onpause": "onPause", "onended": "onEnded",
    "onanimationend": "onAnimationEnd", "ontransitionend": "onTransitionEnd",
}

# Attributes React types as numbers. Converted only when the value really is
# an integer, so things like step="any" stay strings.
NUMERIC_ATTRS = {"rows", "cols", "size", "span", "start", "maxlength", "minlength",
                 "tabindex", "colspan", "rowspan"}

# Attributes React types as booleans, written in HTML as "true"/"false".
BOOLEANISH_ATTRS = {"spellcheck", "draggable", "contenteditable"}

BOOL_ATTRS = {"disabled", "checked", "selected", "required", "readonly", "autofocus",
              "multiple", "open", "hidden", "async", "defer", "novalidate", "reversed",
              "loop", "muted", "controls", "autoplay", "playsinline", "default", "itemscope",
              "allowfullscreen", "formnovalidate", "ismap", "inert", "seamless"}


def css_prop_to_js(prop: str) -> str:
    """margin-top -> marginTop;  --custom-prop stays verbatim."""
    prop = prop.strip()
    if prop.startswith("--"):
        return prop
    head, *rest = prop.split("-")
    return head + "".join(p[:1].upper() + p[1:] for p in rest)


def style_to_object(value: str) -> str:
    """Turn an inline style string into a JSX style object literal."""
    pairs = []
    for decl in value.split(";"):
        if ":" not in decl:
            continue
        prop, _, val = decl.partition(":")
        prop, val = prop.strip(), val.strip()
        if not prop or not val:
            continue
        pairs.append(f"{json.dumps(css_prop_to_js(prop))}: {json.dumps(val)}")
    return "{{" + ", ".join(pairs) + "}}"


def escape_text(text: str) -> str:
    """JSX text: braces would open an expression, so they must be escaped."""
    if "{" in text or "}" in text:
        return "{" + json.dumps(text) + "}"
    # `>` is legal in JSX text but `<` is not; the parser never yields a bare `<`.
    return text


class ToJSX(HTMLParser):
    def __init__(self):
        # convert_charrefs turns &nbsp; etc. into real characters, which render
        # identically and keep the JSX free of entity syntax.
        super().__init__(convert_charrefs=True)
        self.out = []
        self.depth = 0
        self.skip = 0          # inside <script>/<style>: drop, handled separately
        self.handlers = 0

    def pad(self):
        return "  " * (self.depth + 3)

    def emit_attrs(self, attrs):
        parts = []
        for name, value in attrs:
            low = name.lower()

            if low.startswith("on"):
                # Reproduce inline-handler semantics rather than hand-translating
                # each one: `this` is the element and `event` is the event.
                react = EVENT_MAP.get(low)
                if react is None:
                    raise ValueError(f"unmapped event attribute: {low}")
                parts.append(f"{react}={{legacyHandler({json.dumps(value or '')})}}")
                self.handlers += 1
                continue

            if low == "style" and value:
                parts.append(f"style={style_to_object(value)}")
                continue

            jsx = ATTR_MAP.get(low, name)

            if low in BOOL_ATTRS:
                # Bare presence, "" and the attribute's own name all mean true.
                if value is None or value.lower() in ("", low, "true"):
                    parts.append(f"{jsx}={{true}}")
                elif value.lower() == "false":
                    parts.append(f"{jsx}={{false}}")
                else:
                    parts.append(f"{jsx}={json.dumps(value)}")
                continue

            if value is None:
                parts.append(f'{jsx}=""')
                continue

            if low in BOOLEANISH_ATTRS and value.lower() in ("true", "false"):
                parts.append(f"{jsx}={{{value.lower()}}}")
                continue

            if low in NUMERIC_ATTRS and re.fullmatch(r"-?\d+", value.strip()):
                parts.append(f"{jsx}={{{int(value)}}}")
                continue

            parts.append(f"{jsx}={json.dumps(value)}")
        return (" " + " ".join(parts)) if parts else ""

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
            return
        if self.skip:
            return
        a = self.emit_attrs(attrs)
        if tag in VOID:
            self.out.append(f"{self.pad()}<{tag}{a} />")
        else:
            self.out.append(f"{self.pad()}<{tag}{a}>")
            self.depth += 1

    def handle_startendtag(self, tag, attrs):
        if self.skip or tag in ("script", "style"):
            return
        self.out.append(f"{self.pad()}<{tag}{self.emit_attrs(attrs)} />")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip = max(0, self.skip - 1)
            return
        if self.skip or tag in VOID:
            return
        self.depth = max(0, self.depth - 1)
        self.out.append(f"{self.pad()}</{tag}>")

    def handle_data(self, data):
        if self.skip:
            return
        if not data.strip():
            return
        self.out.append(self.pad() + escape_text(data.strip()))

    def handle_comment(self, data):
        if self.skip:
            return
        safe = data.replace("*/", "*\\/")
        self.out.append(f"{self.pad()}{{/*{safe}*/}}")


# Credential shapes that must never reach public/ or the browser bundle.
# The original moeai.html carried a live Gemini key in a `DEFAULT_API_KEY`
# constant; copying the script verbatim published it. Keys belong in
# app/api/moeai/route.ts, which is the only place they are ever read.
SECRET_PATTERNS = [
    re.compile(r"AIza[0-9A-Za-z_\-]{20,}"),          # Google
    re.compile(r"sk-[A-Za-z0-9]{20,}"),               # OpenAI-style
    re.compile(r"gsk_[A-Za-z0-9]{20,}"),              # Groq
    re.compile(r"sk-or-v1-[A-Za-z0-9]{20,}"),         # OpenRouter
    re.compile(r"\b[0-9]{9,10}:AA[A-Za-z0-9_\-]{30,}"),  # Telegram bot token
    re.compile(r"eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}"),  # JWT
]


def strip_secrets(text: str, where: str):
    """Blank out any credential literal, and say how many were found."""
    found = 0
    for pattern in SECRET_PATTERNS:
        text, n = pattern.subn("", text)
        found += n
    if found:
        print(f"  !! {where}: removed {found} credential literal(s) — "
              f"rotate them, they were public")
    return text


def split_document(source: str):
    """Pull the page apart into head links, CSS, script and body markup."""
    css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", source, re.S))

    scripts = re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", source, re.S)
    script = "\n".join(scripts)

    externals = re.findall(r'<(?:link|script)[^>]*(?:href|src)="(https://[^"]+)"[^>]*>', source)

    body = re.search(r"<body[^>]*>(.*)</body>", source, re.S)
    markup = body.group(1) if body else ""

    title = re.search(r"<title>(.*?)</title>", source, re.S)
    return {
        "css": css,
        "script": script,
        "externals": externals,
        "markup": markup,
        "title": html.unescape(title.group(1).strip()) if title else "",
    }



# ─────────────────────────────────────────────────────────────────────────────
# Behaviour patches
#
# The port keeps every page's script byte-identical EXCEPT where it did
# something the new architecture must not do. Each patch is anchored on exact
# source text, so if the original ever changes the converter fails loudly
# instead of silently skipping.
# ─────────────────────────────────────────────────────────────────────────────

MOEAI_CALL_PROVIDER = """async function callProvider(msgs,ctx){
  // ── PORT PATCH (scripts/port-legacy.py) ────────────────────────────────
  // The original called Gemini and Groq straight from the browser using a key
  // held in localStorage, with one hardcoded as a fallback. Keys never reach
  // the browser now. This posts to /api/moeai, which identifies the student
  // from their session, enforces their hourly cap, retrieves their own
  // curriculum and library, assembles the real MoeAI prompt, and streams the
  // answer back as plain text.
  //
  // That plain text is re-wrapped into the line-delimited JSON this UI already
  // parses ({"delta":"..."}), so nothing downstream of here had to change.
  let res;
  try{
    res=await fetch('/api/moeai',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        message:(msgs[msgs.length-1]&&msgs[msgs.length-1].content)||'',
        conversationId:MOEAI_SERVER_CHATS[active]||null
      }),
      signal:aborter?aborter.signal:undefined
    });
  }catch(e){ return null; }

  if(!res.ok||!res.body){
    let msg='MoeAI is unavailable right now.';
    try{ const j=await res.json(); if(j&&j.error) msg=j.error; }catch(e){}
    toast(msg);
    return null;
  }

  const cid=res.headers.get('x-conversation-id');
  if(cid) MOEAI_SERVER_CHATS[active]=cid;

  const upstream=res.body.getReader();
  const enc=new TextEncoder(), dec=new TextDecoder();
  return { body: new ReadableStream({
    async pull(controller){
      const {done,value}=await upstream.read();
      if(done){ controller.enqueue(enc.encode('data: [DONE]\\n')); controller.close(); return; }
      const text=dec.decode(value,{stream:true});
      if(text) controller.enqueue(enc.encode(JSON.stringify({delta:text})+'\\n'));
    }
  })};
}

// Maps this UI's client-side chat ids to the conversation rows the server
// creates, so reopening a chat continues the same server-side thread.
const MOEAI_SERVER_CHATS={};
"""

SCRIPT_PATCHES = {
    "moeai": [(
        "route the chat through /api/moeai instead of calling providers from the browser",
        re.compile(r"async function callProvider\(msgs,ctx\)\{.*?\n\}\n(?=async function send)", re.S),
        MOEAI_CALL_PROVIDER,
    )],
}


def apply_patches(name: str, script: str) -> str:
    for description, pattern, replacement in SCRIPT_PATCHES.get(name, []):
        # A plain string replacement would have its backslash escapes processed
        # by re, turning the JavaScript "\\n" inside it into a real newline and
        # breaking the string literal. A function replacement is inserted as-is.
        script, n = pattern.subn(lambda _m: replacement, script, count=1)
        if n == 0:
            raise SystemExit(
                f"port-legacy: patch target not found in {name}.js "
                f"({description}). The original changed; update the anchor."
            )
        print(f"  patched {name}.js: {description}")
    return script


def convert(name: str):
    src_path = os.path.join(LEGACY, f"{name}.html")
    with open(src_path, encoding="utf-8") as fh:
        source = fh.read()

    doc = split_document(source)
    parser = ToJSX()
    parser.feed(doc["markup"])
    parser.close()

    return {
        "jsx": "\n".join(parser.out),
        "handlers": parser.handlers,
        **doc,
    }




# ─────────────────────────────────────────────────────────────────────────────
# Emitter
# ─────────────────────────────────────────────────────────────────────────────

PAGES = {
    "index":      dict(route="",           title="EDUMOE · Learn Computer Science The Cool Way",
                       desc="EduMoe is a free platform for FUE Computer Science students: courses, simulators, quizzes, ranked practice and MoeAI, a curriculum-aware tutor.",
                       component="Home"),
    "courses":    dict(route="courses",    title="Courses",
                       desc="First-year Computer Science at FUE: lectures, notes and videos in one place.",
                       component="Courses"),
    "simulators": dict(route="simulators", title="Simulators",
                       desc="Interactive C++ and logic-design simulators for first-year Computer Science.",
                       component="Simulators"),
    "quizzes":    dict(route="quizzes",    title="Quizzes",
                       desc="Practice questions drawn from your own lecture material.",
                       component="Quizzes"),
    "ranked":     dict(route="ranked",     title="Ranked",
                       desc="Live competitive quiz matches against other students on your own syllabus.",
                       component="Ranked"),
    "dashboard":  dict(route="dashboard",  title="Dashboard",
                       desc="Your progress, your weak spots, and what MoeAI suggests revising next.",
                       component="Dashboard"),
    "moeai":      dict(route="moeai",      title="MoeAI — your tutor",
                       desc="Ask in Egyptian Arabic, Franco-Arabic or English. MoeAI answers from your own lecture material.",
                       component="MoeAI"),
}

# The original pages were standalone files that never linked to each other:
# every nav item fired a "coming soon" toast. Those pages all exist now, so the
# only content change this converter makes is pointing them at the real routes.
# Nothing else about the markup is touched.
RELINK = [
    (r"Courses\s+(?:page\s+)?coming soon",    "/courses"),
    (r"Simulators\s+(?:page\s+)?coming soon", "/simulators"),
    (r"Quizzes\s+(?:page\s+)?coming soon",    "/quizzes"),
    (r"Ranked\s+(?:page\s+)?coming soon",     "/ranked"),
    (r"MoeAI is coming soon",                 "/moeai"),
    (r"Dashboard\s+(?:page\s+)?coming soon",  "/dashboard"),
    (r"About\s+coming soon",                  "/about"),
]


def relink(markup: str):
    """Point dead nav links at the routes that now exist. Returns (markup, log)."""
    log = []

    def sub_anchor(match):
        tag = match.group(0)
        toast = re.search(r"showToast\('([^']*)'\)", tag)
        if not toast:
            return tag
        for pattern, href in RELINK:
            if re.search(pattern, toast.group(1), re.I):
                new = re.sub(r'href="[^"]*"', f'href="{href}"', tag)
                new = re.sub(r"\sonclick=\"[^\"]*\"", "", new)
                log.append(f'{toast.group(1)!r} -> href="{href}"')
                return new
        return tag

    markup = re.sub(r"<a\b[^>]*onclick=\"showToast\([^\"]*\)\"[^>]*>", sub_anchor, markup)
    before = markup
    markup = markup.replace('href="index.html"', 'href="/"')
    if markup != before:
        log.append('href="index.html" -> href="/"')
    return markup, log


LEGACY_TSX = '''"use client";
/**
 * {title}
 *
 * Converted from reference/legacy-html/{name}.html by scripts/port-legacy.py.
 * The markup below is that file's <body>, translated HTML -> JSX structurally.
 * The styling lives in ./legacy.css, copied byte-for-byte from its <style>
 * block, and the behaviour lives in /legacy/{name}.js, copied byte-for-byte
 * from its <script> block.
 *
 * Do not restyle this by hand. If it looks wrong, diff it against the original.
 */
import {{ legacyHandler, useLegacyScripts }} from "@/lib/legacy";
import "./legacy.css";

const STYLESHEETS: string[] = {stylesheets};
const SCRIPTS: string[] = {scripts};

export default function {component}() {{
  useLegacyScripts(STYLESHEETS, SCRIPTS, "/legacy/{name}.js");

  return (
    <>
{jsx}
    </>
  );
}}
'''

PAGE_TSX = '''import type {{ Metadata }} from "next";
import {component} from "./{component}";

export const metadata: Metadata = {{
  title: {title},
  description: {desc},
  alternates: {{ canonical: "/{route}" }},
}};

export default function Page() {{
  return <{component} />;
}}
'''


def emit(name: str):
    info = PAGES[name]
    src_path = os.path.join(LEGACY, f"{name}.html")
    with open(src_path, encoding="utf-8") as fh:
        source = fh.read()

    doc = split_document(source)
    markup, link_log = relink(doc["markup"])

    parser = ToJSX()
    parser.feed(markup)
    parser.close()

    route_dir = os.path.join(ROOT, "app", "(site)", info["route"])
    os.makedirs(route_dir, exist_ok=True)

    with open(os.path.join(route_dir, "legacy.css"), "w", encoding="utf-8") as fh:
        fh.write(doc["css"].strip() + "\n")

    sheets = [u for u in doc["externals"] if ".css" in u or "css2?" in u]
    js = [u for u in doc["externals"] if u.endswith(".js")]

    with open(os.path.join(route_dir, f"{info['component']}.tsx"), "w", encoding="utf-8") as fh:
        fh.write(LEGACY_TSX.format(
            title=info["title"], name=name, component=info["component"],
            jsx=parser.out and "\n".join(parser.out) or "",
            stylesheets=json.dumps(sheets, indent=2),
            scripts=json.dumps(js, indent=2),
        ))

    # The homepage keeps the original document's exact <title>; the layout's
    # "%s · EduMoe" template would otherwise append the brand to it twice.
    title = (json.dumps(info["title"]) if info["route"]
             else "{ absolute: " + json.dumps(info["title"]) + " }")

    with open(os.path.join(route_dir, "page.tsx"), "w", encoding="utf-8") as fh:
        fh.write(PAGE_TSX.format(
            component=info["component"], route=info["route"],
            title=title, desc=json.dumps(info["desc"]),
        ))

    js_dir = os.path.join(ROOT, "public", "legacy")
    os.makedirs(js_dir, exist_ok=True)
    with open(os.path.join(js_dir, f"{name}.js"), "w", encoding="utf-8") as fh:
        fh.write(apply_patches(name, strip_secrets(doc["script"].strip(), f"public/legacy/{name}.js")) + "\n")

    return dict(name=name, jsx=len(parser.out), css=len(doc["css"].splitlines()),
                js=len(doc["script"].splitlines()), handlers=parser.handlers,
                sheets=len(sheets), scripts=len(js), relinked=link_log)


if __name__ == "__main__":
    targets = sys.argv[1:] or list(PAGES)
    for page in targets:
        r = emit(page)
        print(f"{r['name']:<11} jsx={r['jsx']:<5} css={r['css']:<5} js={r['js']:<5} "
              f"handlers={r['handlers']:<3} sheets={r['sheets']} deps={r['scripts']}")
        for line in r["relinked"]:
            print(f"            relink: {line}")
