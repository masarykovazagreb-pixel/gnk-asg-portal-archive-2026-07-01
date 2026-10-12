/*
 * SPT 2.5 — instalacijski program za Windows 10/11            produced by GNK ASG
 *
 * Isti izvorni kod daje dvije datoteke (vidi spt/windows/build_installer.py):
 *
 *   SPT-Setup-<verzija>.exe   (bez SPT_UNINSTALLER)
 *       Na kraj .exe datoteke build_installer.py dodaje ZIP paket i 16-bajtni
 *       završni zapis:  [ZIP][8 B "SPTPKG01"][8 B duljina ZIP-a, little-endian]
 *       Program paket zapiše u %TEMP%\SPT-Setup-..., raspakira ga Windowsovim
 *       tar.exe (rezerva: PowerShell Expand-Archive), pokrene grafičku
 *       instalaciju setup\install.ps1 i na kraju obriše privremenu mapu.
 *       Argumenti /S, /SILENT, /QUIET = tiha instalacija (bez prozora).
 *
 *   SPT-Uninstall.exe         (-DSPT_UNINSTALLER)
 *       Kopira se u instalacijsku mapu; pokreće uninstall.ps1 iz iste mape.
 *       /S = tiha deinstalacija.
 *
 * Bez administratorskih prava (manifest: asInvoker) — SPT se instalira samo
 * za trenutnog korisnika u %LOCALAPPDATA%\Programs\SPT.
 */
#include <windows.h>
#include <shellapi.h>
#include <string.h>
#include <wchar.h>

#ifndef SPT_VERSION
#define SPT_VERSION "2.5.0"
#endif
#define WIDEN2(x) L##x
#define WIDEN(x) WIDEN2(x)
#define SPT_VERSION_W WIDEN(SPT_VERSION)

#ifdef SPT_UNINSTALLER
#define APP_TITLE L"SPT " SPT_VERSION_W L" \x2014 deinstalacija"
#else
#define APP_TITLE L"SPT " SPT_VERSION_W L" \x2014 instalacija"
#endif

#define PATH_CHARS 2048
#define CMD_CHARS 8192

static void show_error(const wchar_t *msg, DWORD err)
{
    wchar_t text[3072];
    wchar_t sys[1024];
    sys[0] = 0;
    if (err) {
        FormatMessageW(FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS, NULL, err, 0, sys, 1024, NULL);
        _snwprintf(text, 3072, L"%ls\n\nKod greške %lu: %ls\n\nproduced by GNK ASG", msg, (unsigned long)err, sys);
    } else {
        _snwprintf(text, 3072, L"%ls\n\nproduced by GNK ASG", msg);
    }
    text[3071] = 0;
    MessageBoxW(NULL, text, APP_TITLE, MB_OK | MB_ICONERROR | MB_SETFOREGROUND);
}

static BOOL has_silent_flag(void)
{
    int argc = 0, i;
    BOOL silent = FALSE;
    LPWSTR *argv = CommandLineToArgvW(GetCommandLineW(), &argc);
    if (!argv)
        return FALSE;
    for (i = 1; i < argc; ++i) {
        const wchar_t *a = argv[i];
        if (!_wcsicmp(a, L"/S") || !_wcsicmp(a, L"/SILENT") || !_wcsicmp(a, L"/VERYSILENT") ||
            !_wcsicmp(a, L"/QUIET") || !_wcsicmp(a, L"-S") || !_wcsicmp(a, L"--silent") ||
            !_wcsicmp(a, L"-Silent"))
            silent = TRUE;
    }
    LocalFree(argv);
    return silent;
}

static BOOL file_exists(const wchar_t *path)
{
    DWORD a = GetFileAttributesW(path);
    return a != INVALID_FILE_ATTRIBUTES && !(a & FILE_ATTRIBUTE_DIRECTORY);
}

/* C:\Windows\System32\<rel> */
static BOOL system_path(const wchar_t *rel, wchar_t *out, size_t cap)
{
    wchar_t sys[MAX_PATH];
    UINT n = GetSystemDirectoryW(sys, MAX_PATH);
    if (!n || n >= MAX_PATH)
        return FALSE;
    _snwprintf(out, cap, L"%ls\\%ls", sys, rel);
    out[cap - 1] = 0;
    return file_exists(out);
}

/* Pokreni naredbu bez konzolnog prozora i pričekaj kraj. */
static BOOL run_hidden(wchar_t *cmdline, DWORD *exit_code)
{
    STARTUPINFOW si;
    PROCESS_INFORMATION pi;
    DWORD code = 1;
    ZeroMemory(&si, sizeof(si));
    ZeroMemory(&pi, sizeof(pi));
    si.cb = sizeof(si);
    if (!CreateProcessW(NULL, cmdline, NULL, NULL, FALSE, CREATE_NO_WINDOW, NULL, NULL, &si, &pi))
        return FALSE;
    WaitForSingleObject(pi.hProcess, INFINITE);
    GetExitCodeProcess(pi.hProcess, &code);
    CloseHandle(pi.hThread);
    CloseHandle(pi.hProcess);
    if (exit_code)
        *exit_code = code;
    return TRUE;
}

#ifndef SPT_UNINSTALLER

static const unsigned char PKG_MAGIC[8] = {'S', 'P', 'T', 'P', 'K', 'G', '0', '1'};
static unsigned char copy_buf[1 << 16];

/* PowerShell jednostruki navodnici: ' -> '' */
static void ps_quote(const wchar_t *in, wchar_t *out, size_t cap)
{
    size_t j = 0;
    for (; *in && j + 2 < cap; ++in) {
        if (*in == L'\'')
            out[j++] = L'\'';
        out[j++] = *in;
    }
    out[j] = 0;
}

static void remove_tree(const wchar_t *dir)
{
    static wchar_t from[PATH_CHARS + 2];
    SHFILEOPSTRUCTW op;
    ZeroMemory(from, sizeof(from));
    wcsncpy(from, dir, PATH_CHARS - 1); /* dvostruki NUL na kraju */
    ZeroMemory(&op, sizeof(op));
    op.wFunc = FO_DELETE;
    op.pFrom = from;
    op.fFlags = FOF_NO_UI;
    SHFileOperationW(&op);
}

/* Izdvoji ZIP paket s kraja vlastite .exe datoteke u zip_path. */
static BOOL write_payload(const wchar_t *self, const wchar_t *zip_path)
{
    HANDLE in, out = INVALID_HANDLE_VALUE;
    unsigned char trailer[16];
    unsigned long long zip_len = 0, left;
    LARGE_INTEGER size, pos;
    DWORD got = 0, want, n, w;
    BOOL ok = FALSE;
    int i;

    in = CreateFileW(self, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
    if (in == INVALID_HANDLE_VALUE) {
        show_error(L"Ne mogu otvoriti instalacijsku datoteku.", GetLastError());
        return FALSE;
    }
    if (!GetFileSizeEx(in, &size) || size.QuadPart < (LONGLONG)sizeof(trailer))
        goto corrupt;
    pos.QuadPart = size.QuadPart - (LONGLONG)sizeof(trailer);
    if (!SetFilePointerEx(in, pos, NULL, FILE_BEGIN) ||
        !ReadFile(in, trailer, sizeof(trailer), &got, NULL) || got != sizeof(trailer))
        goto corrupt;
    if (memcmp(trailer, PKG_MAGIC, sizeof(PKG_MAGIC)) != 0)
        goto corrupt;
    for (i = 7; i >= 0; --i)
        zip_len = (zip_len << 8) | trailer[8 + i];
    if (zip_len == 0 || zip_len > (unsigned long long)(size.QuadPart - (LONGLONG)sizeof(trailer)))
        goto corrupt;
    pos.QuadPart = size.QuadPart - (LONGLONG)sizeof(trailer) - (LONGLONG)zip_len;
    if (!SetFilePointerEx(in, pos, NULL, FILE_BEGIN))
        goto corrupt;

    out = CreateFileW(zip_path, GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_TEMPORARY, NULL);
    if (out == INVALID_HANDLE_VALUE) {
        show_error(L"Ne mogu zapisati privremenu datoteku u mapu TEMP.", GetLastError());
        goto done;
    }
    left = zip_len;
    while (left > 0) {
        want = left > sizeof(copy_buf) ? (DWORD)sizeof(copy_buf) : (DWORD)left;
        n = 0;
        w = 0;
        if (!ReadFile(in, copy_buf, want, &n, NULL) || n != want)
            goto corrupt;
        if (!WriteFile(out, copy_buf, n, &w, NULL) || w != n) {
            show_error(L"Zapisivanje u mapu TEMP nije uspjelo (ima li dovoljno mjesta na disku?).", GetLastError());
            goto done;
        }
        left -= n;
    }
    ok = TRUE;
    goto done;

corrupt:
    show_error(L"Instalacijska datoteka je oštećena ili nepotpuna.\nPreuzmite SPT-Setup ponovno.", 0);
done:
    if (out != INVALID_HANDLE_VALUE)
        CloseHandle(out);
    CloseHandle(in);
    return ok;
}

static int run_setup(const wchar_t *self, const wchar_t *ps, BOOL silent)
{
    static wchar_t tmp[MAX_PATH + 1], dir[PATH_CHARS], zip[PATH_CHARS], script[PATH_CHARS];
    static wchar_t tar[PATH_CHARS], qzip[PATH_CHARS * 2], qdir[PATH_CHARS * 2], cmd[CMD_CHARS];
    DWORD n, code = 1;
    int attempt;
    BOOL made = FALSE;

    n = GetTempPathW(MAX_PATH + 1, tmp);
    if (!n || n > MAX_PATH) {
        show_error(L"Ne mogu pronaći mapu TEMP.", GetLastError());
        return 1;
    }
    for (attempt = 0; attempt < 50 && !made; ++attempt) {
        _snwprintf(dir, PATH_CHARS, L"%lsSPT-Setup-%lu-%lu", tmp, (unsigned long)GetCurrentProcessId(),
                   (unsigned long)(GetTickCount() + (DWORD)attempt));
        dir[PATH_CHARS - 1] = 0;
        if (CreateDirectoryW(dir, NULL))
            made = TRUE;
        else if (GetLastError() != ERROR_ALREADY_EXISTS)
            break;
    }
    if (!made) {
        show_error(L"Ne mogu stvoriti privremenu mapu u mapi TEMP.", GetLastError());
        return 1;
    }
    _snwprintf(zip, PATH_CHARS, L"%ls\\payload.zip", dir);
    zip[PATH_CHARS - 1] = 0;
    _snwprintf(script, PATH_CHARS, L"%ls\\setup\\install.ps1", dir);
    script[PATH_CHARS - 1] = 0;

    if (!write_payload(self, zip)) {
        remove_tree(dir);
        return 1;
    }

    /* 1) tar.exe (Windows 10 1803+ i Windows 11) */
    if (system_path(L"tar.exe", tar, PATH_CHARS)) {
        _snwprintf(cmd, CMD_CHARS, L"\"%ls\" -xf \"%ls\" -C \"%ls\"", tar, zip, dir);
        cmd[CMD_CHARS - 1] = 0;
        run_hidden(cmd, &code);
    }
    /* 2) rezerva: PowerShell Expand-Archive */
    if (!file_exists(script)) {
        ps_quote(zip, qzip, PATH_CHARS * 2);
        ps_quote(dir, qdir, PATH_CHARS * 2);
        _snwprintf(cmd, CMD_CHARS,
                   L"\"%ls\" -NoProfile -ExecutionPolicy Bypass -Command \"Expand-Archive -LiteralPath '%ls' -DestinationPath '%ls' -Force\"",
                   ps, qzip, qdir);
        cmd[CMD_CHARS - 1] = 0;
        run_hidden(cmd, &code);
    }
    if (!file_exists(script)) {
        show_error(L"Raspakiravanje instalacijskog paketa nije uspjelo.", 0);
        remove_tree(dir);
        return 1;
    }
    DeleteFileW(zip);

    /* 3) grafička instalacija (install.ps1) */
    _snwprintf(cmd, CMD_CHARS,
               L"\"%ls\" -NoProfile -ExecutionPolicy Bypass -STA -File \"%ls\" -PayloadDir \"%ls\" -SetupExe \"%ls\"%ls",
               ps, script, dir, self, silent ? L" -Silent" : L"");
    cmd[CMD_CHARS - 1] = 0;
    code = 1;
    if (!run_hidden(cmd, &code)) {
        show_error(L"Ne mogu pokrenuti Windows PowerShell.", GetLastError());
        code = 1;
    }
    remove_tree(dir);
    return (int)code;
}

#else /* SPT_UNINSTALLER */

static int run_uninstall(const wchar_t *self, const wchar_t *ps, BOOL silent)
{
    static wchar_t dir[PATH_CHARS], script[PATH_CHARS], cmd[CMD_CHARS];
    wchar_t *slash;
    DWORD code = 1;

    wcsncpy(dir, self, PATH_CHARS - 1);
    dir[PATH_CHARS - 1] = 0;
    slash = wcsrchr(dir, L'\\');
    if (slash)
        *slash = 0;
    _snwprintf(script, PATH_CHARS, L"%ls\\uninstall.ps1", dir);
    script[PATH_CHARS - 1] = 0;
    if (!file_exists(script)) {
        show_error(L"Nedostaje uninstall.ps1 u mapi programa — SPT je možda već uklonjen.", 0);
        return 1;
    }
    _snwprintf(cmd, CMD_CHARS,
               L"\"%ls\" -NoProfile -ExecutionPolicy Bypass -STA -File \"%ls\" -InstallDir \"%ls\"%ls",
               ps, script, dir, silent ? L" -Silent" : L"");
    cmd[CMD_CHARS - 1] = 0;
    if (!run_hidden(cmd, &code)) {
        show_error(L"Ne mogu pokrenuti Windows PowerShell.", GetLastError());
        return 1;
    }
    return (int)code;
}

#endif

int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, PWSTR pCmdLine, int nCmdShow)
{
    static wchar_t self[PATH_CHARS], ps[PATH_CHARS];
    DWORD n;
    BOOL silent;
    (void)hInstance;
    (void)hPrevInstance;
    (void)pCmdLine;
    (void)nCmdShow;

    silent = has_silent_flag();
    n = GetModuleFileNameW(NULL, self, PATH_CHARS);
    if (!n || n >= PATH_CHARS) {
        show_error(L"Ne mogu odrediti putanju programa.", GetLastError());
        return 1;
    }
    if (!system_path(L"WindowsPowerShell\\v1.0\\powershell.exe", ps, PATH_CHARS)) {
        show_error(L"Windows PowerShell nije pronađen (potreban je za instalaciju).", 0);
        return 1;
    }
    AllowSetForegroundWindow(ASFW_ANY); /* prozor instalacije smije doći u prvi plan */
#ifdef SPT_UNINSTALLER
    return run_uninstall(self, ps, silent);
#else
    return run_setup(self, ps, silent);
#endif
}
