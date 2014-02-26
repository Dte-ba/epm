@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe" "%~dp0\.\node_modules\epm\bin\epm-cli.js" %*
) ELSE (
  node "%~dp0\.\node_modules\epm\bin\epm-cli.js" %*
)