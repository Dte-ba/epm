@echo off

set REPORTER=dot

if "%1"=="" goto run
if "%1"=="test" goto test
if "%1"=="test-w" goto test-w

echo make: *** No rule to make target `%1'.  Stop.
goto exit

:test
    ./node_modules/.bin/mocha --reporter %REPORTER%
    goto exit

:test-w
  ./node_modules/.bin/mocha --reporter %REPORTER% --growl --watch
  goto exit
:exit
