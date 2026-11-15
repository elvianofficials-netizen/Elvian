#Requires AutoHotkey v2.0
#SingleInstance Force
; ===========================================================================
;  Elvian global shortcuts for Windows — they work even when the browser is closed.
;  1) Install AutoHotkey v2 (free) from autohotkey.com
;  2) Put YOUR website address below (your GitHub Pages address, ending with "/")
;  3) Double-click this file. To start it with Windows: press Win+R, type  shell:startup
;     and drop a shortcut to this file in the folder that opens.
; ===========================================================================
site    := "https://YOURNAME.github.io/YOUR-REPO/"
appMode := true        ; true = open in a small app-style window, false = normal browser tab

; Ctrl+Alt+1 = splash screen, Ctrl+Alt+2 = Physical ELVIAN, Ctrl+Alt+3 = e-ELVIAN
^!1::OpenElvian("index.html")
^!2::OpenElvian("physical-elvian.html")
^!3::OpenElvian("e-ELVIAN.html")
; Want plain Ctrl+1 / Ctrl+2 / Ctrl+3 everywhere? Replace ^! with ^  — but that takes those keys
; away from every other program (browser tabs, Word, etc.), so it is not recommended.

OpenElvian(page) {
    global site, appMode
    url := site . page
    if appMode {
        for exe in ["msedge.exe", "chrome.exe"] {
            try {
                Run(exe . ' --app="' . url . '"')
                return
            }
        }
    }
    Run(url)
}
