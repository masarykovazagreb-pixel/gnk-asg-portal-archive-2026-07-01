import datetime
import json
import os
import pathlib
import urllib.error
import urllib.parse
import urllib.request

ACCOUNT = os.environ["CLOUDFLARE_ACCOUNT_ID"]
TOKEN = os.environ["CLOUDFLARE_API_TOKEN"]
DATABASE = "2116c4e5-1850-4888-91e7-c47deead3ced"
KV_NAMESPACES = {
    "GNK_ASG_KV": "a3e9e78c7d554d7fa10996da9a89e7bc",
    "GNK_ASG_CONFIG_KV": "d6f5dac9fa034d8d813db0de44eb7b1b",
}
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


def request(url: str, method: str = "GET", body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            raw = response.read()
            return response.status, raw
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()


def d1(sql: str):
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/d1/database/{DATABASE}/query"
    code, raw = request(url, "POST", {"sql": sql})
    try:
        payload = json.loads(raw.decode())
    except Exception:
        payload = {}
    if code != 200 or not payload.get("success"):
        return {"ok": False, "http": code}
    result = (payload.get("result") or [{}])[0]
    return {"ok": True, "http": code, "rows": result.get("results") or []}


def kv(namespace: str, key: str):
    encoded = urllib.parse.quote(key, safe="")
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/storage/kv/namespaces/{namespace}/values/{encoded}"
    code, raw = request(url)
    if code != 200:
        return {"ok": False, "http": code}
    try:
        value = json.loads(raw.decode())
    except Exception:
        value = {}
    selected = {}
    if isinstance(value, dict):
        for name in (
            "pdfR2Key", "pdfSha256", "pdfFilename", "pdfSizeBytes",
            "htmlR2Key", "htmlSha256", "htmlFilename", "htmlSizeBytes",
            "updatedAt", "deadline", "subject", "titleEn",
        ):
            if name in value:
                selected[name] = value[name]
    return {"ok": True, "http": code, "campaign": selected}


summary = d1(
    "SELECT COUNT(*) AS total, COUNT(DISTINCT LOWER(email)) AS unique_emails, "
    "SUM(CASE WHEN approved=1 THEN 1 ELSE 0 END) AS approved, "
    "SUM(CASE WHEN sent_status='POSLANO' THEN 1 ELSE 0 END) AS sent "
    "FROM media_outreach_contacts"
)
tables = d1(
    "SELECT name FROM sqlite_master WHERE type='table' "
    "AND name IN ('media_projects','media_project_contacts','media_project_events') ORDER BY name"
)
serbia = d1(
    "SELECT COUNT(*) AS count, COUNT(DISTINCT outlet) AS outlets "
    "FROM media_outreach_contacts WHERE LOWER(COALESCE(country,'')) LIKE '%serb%' "
    "OR LOWER(COALESCE(country,'')) LIKE '%srb%'"
)
nacional = d1(
    "SELECT COUNT(*) AS count FROM media_outreach_contacts "
    "WHERE LOWER(COALESCE(outlet,'')) LIKE '%nacional%'"
)
campaigns = [
    {"namespace": name, **kv(namespace, "media-command-center:campaign:v1")}
    for name, namespace in KV_NAMESPACES.items()
]
report = {
    "ok": all(item.get("ok") for item in (summary, tables, serbia, nacional)),
    "checked_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "workflow_run_id": os.environ.get("GITHUB_RUN_ID", ""),
    "commit": os.environ.get("GITHUB_SHA", ""),
    "privacy": "Only aggregate D1 counts and campaign asset metadata are recorded.",
    "d1": {
        "summary": (summary.get("rows") or [{}])[0],
        "project_tables": tables.get("rows") or [],
        "serbia": (serbia.get("rows") or [{}])[0],
        "nacional": (nacional.get("rows") or [{}])[0],
        "status": {
            "summary": {"ok": summary.get("ok"), "http": summary.get("http")},
            "tables": {"ok": tables.get("ok"), "http": tables.get("http")},
            "serbia": {"ok": serbia.get("ok"), "http": serbia.get("http")},
            "nacional": {"ok": nacional.get("ok"), "http": nacional.get("http")},
        },
    },
    "campaign_candidates": campaigns,
}
path = pathlib.Path("apps/portal/data/media-project-source-status.json")
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
