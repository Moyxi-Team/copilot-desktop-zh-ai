Option Explicit
Dim shell, fso, launcher
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
launcher = ""
Dim file
For Each file In fso.GetFolder(fso.GetParentFolderName(WScript.ScriptFullName)).Files
  If LCase(fso.GetExtensionName(file.Name)) = "cmd" Then
    launcher = file.Path
    Exit For
  End If
Next
If launcher = "" Then
  WScript.Quit 1
End If
shell.Run "cmd.exe /d /c """ & launcher & """", 0, False
