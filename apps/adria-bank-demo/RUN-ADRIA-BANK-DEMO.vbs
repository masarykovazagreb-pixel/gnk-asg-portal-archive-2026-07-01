Option Explicit
Dim shell, fileSystem, appRoot, electronExe, command
Set shell = CreateObject("WScript.Shell")
Set fileSystem = CreateObject("Scripting.FileSystemObject")
appRoot = fileSystem.GetParentFolderName(WScript.ScriptFullName)
electronExe = appRoot & "\node_modules\electron\dist\electron.exe"
If Not fileSystem.FileExists(electronExe) Then
  MsgBox "Adria Bank Demo is not installed yet. Run Install-Windows.ps1 first.", vbExclamation, "Adria Bank Demo"
  WScript.Quit 1
End If
shell.CurrentDirectory = appRoot
command = Chr(34) & electronExe & Chr(34) & " " & Chr(34) & appRoot & Chr(34)
shell.Run command, 0, False
