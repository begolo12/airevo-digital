@echo off
setlocal
REM Pembungkus Flutter untuk proyek ini.
REM
REM Dua hal yang harus disiapkan sebelum memanggil Flutter di mesin ini:
REM
REM 1. Variabel GIT_CONFIG_ harus dibersihkan. Di lingkungan ini variabel itu
REM    terisi nilai kosong dan git menolaknya, sementara Flutter memakai git
REM    untuk menentukan versinya - sehingga gagal sebelum sempat berjalan.
REM
REM 2. ANDROID_HOME harus menunjuk SDK yang dipasang untuk proyek ini.

set GIT_CONFIG_COUNT=
set GIT_CONFIG_KEY_0=
set GIT_CONFIG_VALUE_0=
set GIT_CONFIG_KEY_1=
set GIT_CONFIG_VALUE_1=
set ANDROID_HOME=C:\dev\android-sdk
set ANDROID_SDK_ROOT=C:\dev\android-sdk
set PATH=C:\dev\flutter-sdk\flutter\bin;C:\dev\android-sdk\platform-tools;%PATH%

flutter %*
endlocal
