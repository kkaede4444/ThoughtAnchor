import { readFile, readdir, stat, mkdir, writeFile, access } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const root = process.cwd(),
  release = path.resolve('release')
const { version } = JSON.parse(await readFile('package.json', 'utf8'))
const base = `ThoughtAnchor-${version}-x64`
const IfNot = '${IfNot}',
  RunningX64 = '${RunningX64}',
  If = '${If}',
  EndIf = '${EndIf}',
  GetParameters = '${GetParameters}'
await mkdir(release, { recursive: true })
const quote = (value) => "'" + value.replaceAll("'", "''") + "'"
const portable = path.join(release, `${base}-portable.zip`)
const compress = spawnSync(
  'powershell.exe',
  [
    '-NoProfile',
    '-Command',
    `[System.Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem') | Out-Null; if ([System.IO.File]::Exists(${quote(portable)})) { [System.IO.File]::Delete(${quote(portable)}) }; [System.IO.Compression.ZipFile]::CreateFromDirectory(${quote(path.resolve('out/native'))}, ${quote(portable)}, [System.IO.Compression.CompressionLevel]::Optimal, $false)`
  ],
  { encoding: 'utf8', windowsHide: true }
)
if (compress.status !== 0) throw new Error(compress.stdout + compress.stderr)
let nsis = process.env.NSIS_DIR ? path.resolve(process.env.NSIS_DIR, 'makensis.exe') : null
if (!nsis) {
  const cache = path.join(process.env.LOCALAPPDATA, 'electron-builder/Cache/nsis-3.0.4.1')
  try {
    for (const name of await readdir(cache)) {
      const candidate = path.join(cache, name, 'makensis.exe')
      try {
        await access(candidate)
        nsis = candidate
        break
      } catch {}
    }
  } catch {}
}
if (!nsis) {
  const cache = path.resolve('.local/nsis'),
    zip = path.join(cache, 'nsis.zip')
  await mkdir(cache, { recursive: true })
  const response = await fetch(
    'https://downloads.sourceforge.net/project/nsis/NSIS%203/3.12/nsis-3.12.zip'
  )
  if (!response.ok)
    throw new Error(
      `NSIS download failed: ${response.status}. Set NSIS_DIR to an installed NSIS directory.`
    )
  await writeFile(zip, Buffer.from(await response.arrayBuffer()))
  const extract = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `[System.Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem') | Out-Null; [System.IO.Compression.ZipFile]::ExtractToDirectory(${quote(zip)}, ${quote(cache)})`
    ],
    { encoding: 'utf8', windowsHide: true }
  )
  if (extract.status !== 0) throw new Error(extract.stdout + extract.stderr)
  nsis = path.join(cache, 'nsis-3.12', 'makensis.exe')
}
async function files(folder, prefix = '') {
  const result = []
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const name = path.join(prefix, entry.name)
    if (entry.isDirectory()) result.push(...(await files(path.join(folder, entry.name), name)))
    else result.push(name)
  }
  return result
}
const source = path.resolve('out/native'),
  manifest = await files(source)
const directories = [
  ...new Set(manifest.map((file) => path.dirname(file)).filter((d) => d !== '.'))
].sort((a, b) => b.length - a.length)
const installer = `Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
Name "ThoughtAnchor ${version}"
OutFile "${path.join(release, `${base}-nsis.exe`)}"
InstallDir "$LOCALAPPDATA\\Programs\\ThoughtAnchorNative"
RequestExecutionLevel user
SetCompressor /SOLID lzma
Icon "${path.resolve('build/icon.ico')}"
!define MUI_FINISHPAGE_RUN "$INSTDIR\\ThoughtAnchor.exe"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "TradChinese"
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Japanese"
!insertmacro MUI_LANGUAGE "Korean"
!insertmacro MUI_LANGUAGE "French"
!insertmacro MUI_LANGUAGE "German"
!insertmacro MUI_LANGUAGE "Spanish"
Function .onInit
  !insertmacro MUI_LANGDLL_DISPLAY
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "ThoughtAnchor requires Windows x64."
    Abort
  ${EndIf}
  ReadRegDWORD $0 HKLM "SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v4\\Full" "Release"
  ${If} $0 < 528040
    MessageBox MB_ICONSTOP "Please install Microsoft .NET Framework 4.8 before installing ThoughtAnchor."
    Abort
  ${EndIf}
  SetRegView 32
  ReadRegStr $0 HKLM "SOFTWARE\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${If} $0 == ""
    ReadRegStr $0 HKCU "SOFTWARE\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${EndIf}
  ${If} $0 == ""
    MessageBox MB_ICONSTOP "Please install Microsoft Edge WebView2 Runtime before installing ThoughtAnchor."
    Abort
  ${EndIf}
FunctionEnd
Section
  SetOutPath "$INSTDIR"
  File /r "${source}\\*"
  WriteUninstaller "$INSTDIR\\Uninstall.exe"
  CreateShortcut "$DESKTOP\\ThoughtAnchor.lnk" "$INSTDIR\\ThoughtAnchor.exe"
  CreateShortcut "$SMPROGRAMS\\ThoughtAnchor.lnk" "$INSTDIR\\ThoughtAnchor.exe"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ThoughtAnchorNative" "DisplayName" "ThoughtAnchor"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ThoughtAnchorNative" "DisplayVersion" "${version}"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ThoughtAnchorNative" "UninstallString" '"$INSTDIR\\Uninstall.exe"'
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ThoughtAnchorNative" "DisplayIcon" "$INSTDIR\\ThoughtAnchor.exe"
SectionEnd
Section "Uninstall"
  ${manifest.map((file) => `Delete "$INSTDIR\\${file}"`).join('\n  ')}
  ${directories.map((folder) => `RMDir "$INSTDIR\\${folder}"`).join('\n  ')}
  Delete "$DESKTOP\\ThoughtAnchor.lnk"
  Delete "$SMPROGRAMS\\ThoughtAnchor.lnk"
  Delete "$INSTDIR\\Uninstall.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\ThoughtAnchorNative"
SectionEnd
`
const single = `Unicode true
!include "FileFunc.nsh"
Name "ThoughtAnchor ${version} Portable"
OutFile "${path.join(release, `${base}-portable.exe`)}"
RequestExecutionLevel user
SilentInstall silent
SetCompressor /SOLID lzma
Icon "${path.resolve('build/icon.ico')}"
Section
  InitPluginsDir
  SetOutPath "$PLUGINSDIR\\ThoughtAnchor"
  File /r "${source}\\*"
  ${GetParameters} $0
  ExecWait '"$PLUGINSDIR\\ThoughtAnchor\\ThoughtAnchor.exe" $0'
SectionEnd
`
await mkdir('.local/package', { recursive: true })
for (const [name, script] of [
  ['installer', installer],
  ['portable', single]
]) {
  const filename = path.resolve(`.local/package/${name}.nsi`)
  await writeFile(filename, script, 'utf8')
  const result = spawnSync(nsis, ['/V2', filename], { encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) throw new Error(result.stdout + result.stderr)
}
const sums = []
for (const name of [`${base}-nsis.exe`, `${base}-portable.exe`, `${base}-portable.zip`]) {
  const buffer = await readFile(path.join(release, name))
  sums.push(`${createHash('sha256').update(buffer).digest('hex')}  ${name}`)
  console.log(name, buffer.length, 'bytes')
}
await writeFile(path.join(release, `SHA256SUMS-${version}.txt`), sums.join('\n') + '\n')
