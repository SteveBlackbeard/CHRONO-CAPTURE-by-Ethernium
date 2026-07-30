from html.parser import HTMLParser
from pathlib import Path


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
]
normalized_html = " ".join(HTML.split()).lower()
for statement in required_contract:
    if statement.lower() not in normalized_html:
        raise SystemExit(f"Missing product-boundary statement: {statement}")

for forbidden in [
    "Re-encoding video stream locally",
    "Conversion Complete! Exporting video",
]:
    if forbidden in HTML:
        raise SystemExit(f"Misleading browser conversion claim returned: {forbidden}")

if "UPSKALETOR-by-Ethernium" not in README:
    raise SystemExit("README must document the independent UPSKALETOR engine")

print("KAPTURA static product contract passed.")
