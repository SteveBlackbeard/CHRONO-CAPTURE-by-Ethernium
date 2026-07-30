from html.parser import HTMLParser
from pathlib import Path
import re
import shutil
import subprocess


ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
README = (ROOT / "README.md").read_text(encoding="utf-8")


class ContractParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"])
        if tag == "a" and values.get("href"):
            self.links.append(values["href"])


parser = ContractParser()
parser.feed(HTML)

duplicates = sorted({item for item in parser.ids if parser.ids.count(item) > 1})
if duplicates:
    raise SystemExit(f"Duplicate HTML ids: {duplicates}")

required_ids = {
    "nav-upskaletor",
    "tab-recorder",
    "tab-vault",
    "tab-converter",
    "tab-upskaletor",
}
missing_ids = sorted(required_ids.difference(parser.ids))
if missing_ids:
    raise SystemExit(f"Missing product tabs: {missing_ids}")

repository = "https://github.com/SteveBlackbeard/UPSKALETOR-by-Ethernium"
if repository not in parser.links or f"{repository}/releases" not in parser.links:
    raise SystemExit("UPSKALETOR repository and release links are required")

required_contract = [
    "KAPTURA is the visual capture studio",
    "UPSKALETOR is the processing engine",
    "No browser transcoding claimed",
    "kaptura.upskaletor-handoff.v1",
    "-Mode ${profile.mode}",
    "-Width ${profile.width}",
    "-Height ${profile.height}",
    "-Encoder ${encoder}",
]
normalized_html = " ".join(HTML.split()).lower()
for statement in required_contract:
    if statement.lower() not in normalized_html:
        raise SystemExit(f"Missing product-boundary statement: {statement}")

for forbidden in [
    "Re-encoding video stream locally",
    "Conversion Complete! Exporting video",
    "startUpskaletorEnhancement",
    "UPSKALETOR COMPLETE",
    "downloadBlob(fileToProcess",
    "exportRecordedAs",
    "setpts=N/(",
    "-Profile \"${profile}\"",
    "-Engine \"${engine}\"",
]:
    if forbidden in HTML:
        raise SystemExit(f"Misleading browser conversion claim returned: {forbidden}")

if "UPSKALETOR-by-Ethernium" not in README:
    raise SystemExit("README must document the independent UPSKALETOR engine")

for required_file in [
    ".github/workflows/release.yml",
    "CHANGELOG.md",
    "KAPTURA.cmd",
    "UPSKALETOR-HANDOFF.md",
    "VERSION",
    "requirements.txt",
    "scripts/build_release.py",
]:
    if not (ROOT / required_file).is_file():
        raise SystemExit(f"Missing release contract file: {required_file}")

version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
if not re.fullmatch(r"\d+\.\d+\.\d+", version):
    raise SystemExit(f"VERSION is not semantic: {version!r}")
if f"KAPTURA-by-Ethernium-v{version}.zip" not in README:
    raise SystemExit("README release filename must match VERSION")

text_extensions = {".bat", ".cmd", ".html", ".md", ".py", ".ps1", ".txt", ".yml", ".yaml"}
for path in ROOT.rglob("*"):
    if (
        not path.is_file()
        or ".git" in path.parts
        or ".venv" in path.parts
        or "__pycache__" in path.parts
        or "dist" in path.parts
        or path.suffix.lower() not in text_extensions
    ):
        continue
    content = path.read_text(encoding="utf-8", errors="replace")
    if re.search(r"(?i)[a-z]:\\users\\[^\\]+", content):
        raise SystemExit(f"Personal absolute path found: {path.relative_to(ROOT)}")

scripts = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", HTML, flags=re.DOTALL | re.IGNORECASE)
if not scripts:
    raise SystemExit("No inline application script found")
node = shutil.which("node")
if node:
    result = subprocess.run(
        [node, "--check", "-"],
        input="\n".join(scripts),
        text=True,
        encoding="utf-8",
        capture_output=True,
        check=False,
    )
    if result.returncode:
        raise SystemExit(f"Inline JavaScript syntax failed:\n{result.stderr}")

print("KAPTURA static product contract passed.")
