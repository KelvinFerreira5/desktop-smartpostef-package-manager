!macro NSIS_HOOK_POSTUNINSTALL
  MessageBox MB_YESNO|MB_ICONQUESTION "Remove all application data (settings, releases, logs)?$\n$\nData location: $LOCALAPPDATA\smartpostef-package-manager" /SD IDYES IDNO SkipRemoveData
    RMDir /r "$LOCALAPPDATA\smartpostef-package-manager"
  SkipRemoveData:
!macroend
