"""
SPT 2.5 — pokretač za Windows (desktop)                    produced by GNK ASG

Pokreće lokalni SPT poslužitelj (server.py) skriveno u pozadini i otvara SPT
u vlastitom prozoru (Microsoft Edge / Google Chrome "app" način; ako ih nema,
u zadanom pregledniku). Instalacija (SPT-Setup-2.5.0.exe) postavlja prečace:

  pythonw spt_launcher.pyw          pokreni SPT (ili otvori prozor ako već radi)
  pythonw spt_launcher.pyw --lan    mrežni način: SPT_HOST=0.0.0.0 (satovi, UWB
                                    gateway i tableti u lokalnoj mreži)
  pythonw spt_launcher.pyw --stop   zaustavi SPT poslužitelj

Zadano SPT sluša samo na 127.0.0.1 (ovo računalo) pa Windows vatrozid ne
postavlja pitanja. Zapisi: %LOCALAPPDATA%\\SPT\\logs\\ (launcher.log, server.log).

Za testiranje (i na Linuxu): SPT_DATA_DIR, SPT_LAUNCHER_NO_UI=1,
SPT_LAUNCHER_PORTS="8000,8765".
"""
import json
import os
import signal
import socket
import subprocess
import sys
import threading
import time
import urllib.request
import webbrowser

APP_DIR = os.path.dirname(os.path.abspath(__file__))
TITLE = "SPT 2.5"
SIGNATURE = "produced by GNK ASG"
IS_WIN = os.name == "nt"

if os.environ.get("SPT_DATA_DIR"):
    DATA_DIR = os.environ["SPT_DATA_DIR"]
elif IS_WIN:
    DATA_DIR = os.path.join(os.environ.get("LOCALAPPDATA") or os.path.expanduser("~"), "SPT")
else:
    DATA_DIR = os.path.join(os.path.expanduser("~"), ".spt")
LOG_DIR = os.path.join(DATA_DIR, "logs")
STATE_FILE = os.path.join(DATA_DIR, "server.json")
SERVER_LOG = os.path.join(LOG_DIR, "server.log")
LAUNCHER_LOG = os.path.join(LOG_DIR, "launcher.log")

_ports_env = os.environ.get("SPT_LAUNCHER_PORTS", "")
PORTS = tuple(int(p) for p in _ports_env.split(",") if p.strip().isdigit()) or (8000, 8765, 18000, 18765, 28000)

CREATE_NO_WINDOW = 0x08000000
CREATE_NEW_PROCESS_GROUP = 0x00000200


# ---------------------------------------------------------------------------
# zapisi i poruke
# ---------------------------------------------------------------------------
def _rotate(path, limit=1_000_000):
    try:
        if os.path.getsize(path) > limit:
            os.replace(path, path + ".1")
    except OSError:
        pass


def _setup_logging():
    os.makedirs(LOG_DIR, exist_ok=True)
    _rotate(LAUNCHER_LOG)
    try:
        f = open(LAUNCHER_LOG, "a", encoding="utf-8", buffering=1)
        # pythonw nema konzolu (sys.stdout je None) — sve ide u zapis
        sys.stdout = f
        sys.stderr = f
    except OSError:
        pass


def log(msg):
    try:
        print(time.strftime("%Y-%m-%d %H:%M:%S"), msg, flush=True)
    except Exception:
        pass


def message(text, error=False):
    log(("GREŠKA: " if error else "PORUKA: ") + text.replace("\n", " | "))
    if os.environ.get("SPT_LAUNCHER_NO_UI"):
        return
    if IS_WIN:
        try:
            import ctypes
            flags = 0x10 if error else 0x40  # MB_ICONERROR / MB_ICONINFORMATION
            ctypes.windll.user32.MessageBoxW(None, text, TITLE, flags | 0x10000)  # MB_SETFOREGROUND
        except Exception:
            pass


class Notice:
    """Neblokirajuća obavijest (prvo pokretanje traje dulje dok se gradi baza)."""

    CAPTION = "SPT 2.5 — pokretanje"

    def __init__(self, text):
        self.active = IS_WIN and not os.environ.get("SPT_LAUNCHER_NO_UI")
        log("OBAVIJEST: " + text.replace("\n", " | "))
        if self.active:
            threading.Thread(target=self._show, args=(text,), daemon=True).start()

    def _show(self, text):
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(None, text, self.CAPTION, 0x40 | 0x10000)
        except Exception:
            pass

    def close(self):
        if not self.active:
            return
        try:
            import ctypes
            user32 = ctypes.windll.user32
            user32.FindWindowW.restype = ctypes.c_void_p
            user32.FindWindowW.argtypes = (ctypes.c_wchar_p, ctypes.c_wchar_p)
            user32.PostMessageW.argtypes = (ctypes.c_void_p, ctypes.c_uint, ctypes.c_size_t, ctypes.c_ssize_t)
            for _ in range(20):
                hwnd = user32.FindWindowW("#32770", self.CAPTION)
                if hwnd:
                    user32.PostMessageW(hwnd, 0x0010, 0, 0)  # WM_CLOSE
                    return
                time.sleep(0.05)
        except Exception:
            pass


# ---------------------------------------------------------------------------
# stanje poslužitelja
# ---------------------------------------------------------------------------
def read_state():
    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            st = json.load(f)
        return st if isinstance(st, dict) else {}
    except (OSError, ValueError):
        return {}


def write_state(st):
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(st, f)
    os.replace(tmp, STATE_FILE)


def clear_state():
    try:
        os.remove(STATE_FILE)
    except OSError:
        pass


def spt_version(port, timeout=1.5):
    """Vrati verziju ako na portu radi SPT (GET /api/meta), inače None."""
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/meta", timeout=timeout) as r:
            data = json.loads(r.read().decode("utf-8"))
        if isinstance(data, dict) and "version" in data and "athletes" in data:
            return str(data["version"])
    except Exception:
        pass
    return None


def port_free(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.4)
        if s.connect_ex(("127.0.0.1", port)) == 0:
            return False  # netko već sluša
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if not IS_WIN:  # kao http.server: TIME_WAIT ne smije blokirati port
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind(("127.0.0.1", port))
        return True
    except OSError:
        return False


def process_is_spt(pid):
    """Zaštita od ponovno iskorištenog PID-a: proces mora biti Python (SPT)."""
    if not pid:
        return False
    if IS_WIN:
        try:
            import ctypes
            from ctypes import wintypes
            k32 = ctypes.windll.kernel32
            k32.OpenProcess.restype = wintypes.HANDLE
            k32.OpenProcess.argtypes = (wintypes.DWORD, wintypes.BOOL, wintypes.DWORD)
            k32.QueryFullProcessImageNameW.argtypes = (wintypes.HANDLE, wintypes.DWORD, wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD))
            k32.CloseHandle.argtypes = (wintypes.HANDLE,)
            h = k32.OpenProcess(0x1000, False, int(pid))  # PROCESS_QUERY_LIMITED_INFORMATION
            if not h:
                return False
            try:
                buf = ctypes.create_unicode_buffer(1024)
                size = wintypes.DWORD(1024)
                if not k32.QueryFullProcessImageNameW(h, 0, buf, ctypes.byref(size)):
                    return False
                return os.path.basename(buf.value).lower().startswith("python")
            finally:
                k32.CloseHandle(h)
        except Exception:
            return False
    try:
        with open(f"/proc/{int(pid)}/cmdline", "rb") as f:
            return b"server.py" in f.read()
    except OSError:
        return False


# ---------------------------------------------------------------------------
# pokretanje / zaustavljanje
# ---------------------------------------------------------------------------
def server_python():
    """Za poslužitelj koristi python.exe (konzolni, ali bez prozora) uz pythonw.exe."""
    exe = sys.executable or "python"
    folder, name = os.path.split(exe)
    if IS_WIN and name.lower() == "pythonw.exe":
        cand = os.path.join(folder, "python.exe")
        if os.path.isfile(cand):
            return cand
    return exe


def start_server(port, lan):
    env = dict(os.environ)
    env.update({
        "SPT_PORT": str(port),
        "SPT_NO_BROWSER": "1",
        "SPT_HOST": "0.0.0.0" if lan else "127.0.0.1",
        "PYTHONUTF8": "1",
        "PYTHONIOENCODING": "utf-8",
    })
    _rotate(SERVER_LOG)
    out = open(SERVER_LOG, "ab")
    out.write(f"\n===== {time.strftime('%Y-%m-%d %H:%M:%S')} start port={port} lan={lan} =====\n".encode("utf-8"))
    out.flush()
    cmd = [server_python(), "-X", "utf8", os.path.join(APP_DIR, "server.py")]
    kwargs = dict(cwd=APP_DIR, env=env, stdin=subprocess.DEVNULL, stdout=out, stderr=subprocess.STDOUT, close_fds=True)
    if IS_WIN:
        kwargs["creationflags"] = CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True
    log("pokrećem: " + " ".join(cmd) + f"  (port {port}, {'LAN' if lan else 'lokalno'})")
    proc = subprocess.Popen(cmd, **kwargs)
    out.close()
    return proc


def wait_ready(port, proc, timeout):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if spt_version(port, timeout=1.0):
            log(f"SPT spreman na portu {port} za {time.time() - t0:.1f} s")
            return True
        if proc.poll() is not None:
            log(f"poslužitelj je završio s kodom {proc.returncode}")
            return False
        time.sleep(0.25)
    return False


def start_and_wait(port, lan, timeout):
    """Pokreni poslužitelj i pričekaj. Ako odmah padne (npr. port se još
    oslobađa nakon gašenja), pokušaj ponovno; ako visi, prekini ga."""
    for attempt in range(3):
        proc = start_server(port, lan)
        write_state({"pid": proc.pid, "port": port, "lan": bool(lan), "started": int(time.time())})
        if wait_ready(port, proc, timeout):
            return True
        if proc.poll() is None:
            log(f"poslužitelj ne odgovara {timeout} s — prekidam")
            try:
                proc.kill()
            except OSError:
                pass
            break
        time.sleep(1.0 + attempt)
    clear_state()
    return False


def stop_server(quiet=False):
    st = read_state()
    pid, port = st.get("pid"), st.get("port")
    stopped = False
    if pid and port and spt_version(port) and process_is_spt(pid):
        try:
            os.kill(int(pid), signal.SIGTERM)  # Windows: TerminateProcess
            for _ in range(40):
                if not spt_version(port, timeout=0.5):
                    break
                time.sleep(0.25)
            stopped = True
            log(f"zaustavljen SPT (PID {pid}, port {port})")
        except OSError as e:
            log(f"zaustavljanje nije uspjelo: {e}")
    clear_state()
    if not quiet:
        if stopped:
            message("SPT je zaustavljen.\n\n" + SIGNATURE)
        else:
            message("SPT nije bio pokrenut iz ovog pokretača (nema što zaustaviti).\n\n" + SIGNATURE)
    return 0 if stopped or not pid else 1


def find_app_browser():
    if not IS_WIN:
        return None
    rel_edge = os.path.join("Microsoft", "Edge", "Application", "msedge.exe")
    rel_chrome = os.path.join("Google", "Chrome", "Application", "chrome.exe")
    cands = []
    for rel in (rel_edge, rel_chrome):
        for env in ("ProgramFiles(x86)", "ProgramFiles", "LOCALAPPDATA"):
            base = os.environ.get(env)
            if base:
                cands.append(os.path.join(base, rel))
    try:
        import winreg
        for exe in ("msedge.exe", "chrome.exe"):
            for root in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
                try:
                    key = r"Software\Microsoft\Windows\CurrentVersion\App Paths" + "\\" + exe
                    with winreg.OpenKey(root, key) as k:
                        cands.append(winreg.QueryValue(k, None))
                except OSError:
                    pass
    except ImportError:
        pass
    for c in cands:
        c = (c or "").strip().strip('"')
        if c and os.path.isfile(c):
            return c
    return None


def open_ui(url):
    log("otvaram " + url)
    if os.environ.get("SPT_LAUNCHER_NO_UI"):
        return
    exe = find_app_browser()
    if exe:
        try:
            subprocess.Popen([exe, f"--app={url}", "--start-maximized", "--no-first-run"], close_fds=True)
            return
        except OSError as e:
            log(f"app prozor nije otvoren ({e}) — koristim zadani preglednik")
    webbrowser.open(url)


def launch(lan=False):
    st = read_state()
    saved = st.get("port")
    if saved and spt_version(saved):
        if lan and not st.get("lan"):
            log("traži se mrežni način — ponovno pokrećem SPT")
            stop_server(quiet=True)
            time.sleep(0.8)
        else:
            open_ui(f"http://127.0.0.1:{saved}/")
            return 0
    elif saved:
        clear_state()  # zastarjelo stanje (npr. nakon odjave iz Windowsa)

    # Na Windowsima spajanje na zatvoren port traje ~1 s, pa se ne skeniraju
    # svi portovi: prvi slobodan dobiva SPT; zauzet port se provjeri je li to
    # SPT pokrenut ručno (start_windows.bat) i tada se samo otvori prozor.
    ports = ([saved] if saved else []) + [p for p in PORTS if p != saved]
    port = None
    for _ in range(12):  # nakon zaustavljanja port se oslobodi za tren
        for p in ports:
            if port_free(p):
                port = p
                break
            if not lan and p != saved and spt_version(p):
                open_ui(f"http://127.0.0.1:{p}/")
                return 0
        if port is not None and (port == ports[0] or not saved):
            break
        time.sleep(0.25)
    if port is None:
        message("SPT se ne može pokrenuti: portovi " + ", ".join(map(str, PORTS)) +
                " su zauzeti drugim programima.\n\n" + SIGNATURE, error=True)
        return 2

    db_path = os.path.join(APP_DIR, "spt.db")
    try:
        if os.path.exists(db_path) and os.path.getsize(db_path) == 0:
            os.remove(db_path)  # prazna datoteka (prekinuto prvo pokretanje) — gradi se iznova
            log("uklonjena prazna spt.db")
    except OSError:
        pass
    first_run = not os.path.exists(db_path)
    notice = Notice("SPT priprema bazu podataka (prvo pokretanje).\n"
                    "To traje do jedne minute — prozor SPT-a otvorit će se sam.\n\n" + SIGNATURE) if first_run else None
    timeout = 300 if first_run else 90
    ok = start_and_wait(port, lan, timeout)
    if not ok:
        alt = next((p for p in PORTS if p != port and port_free(p)), None)
        if alt:
            log(f"pokušavam drugi port: {alt}")
            ok = start_and_wait(alt, lan, timeout)
            port = alt if ok else port
    if notice:
        notice.close()
    if not ok:
        message("SPT se nije uspio pokrenuti.\n\nZapis poslužitelja:\n" + SERVER_LOG + "\n\n" + SIGNATURE, error=True)
        return 1
    open_ui(f"http://127.0.0.1:{port}/")
    return 0


def main(argv):
    _setup_logging()
    args = {a.lower() for a in argv[1:]}
    log(f"SPT pokretač {argv[1:]} — Python {sys.version.split()[0]} ({sys.executable})")
    try:
        if "--stop" in args:
            return stop_server(quiet="--quiet" in args)
        return launch(lan="--lan" in args)
    except Exception as e:  # pragma: no cover - zadnja linija obrane
        import traceback
        traceback.print_exc()
        message(f"Neočekivana greška pokretača: {e}\n\nZapis: {LAUNCHER_LOG}\n\n{SIGNATURE}", error=True)
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
