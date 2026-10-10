$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$releaseDirectory = Join-Path $projectRoot 'release'
$archivePath = Join-Path $releaseDirectory 'zalex-certificate-portal.zip'

# Deliberate allowlist: no recursion or dependence on .gitignore.
$files = @(
    '.gitignore', 'README.md', 'index.html', 'package.json', 'package-lock.json',
    'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'vite.config.ts', 'vercel.json',
    'public/favicon.svg',
    'src/main.tsx', 'src/App.tsx', 'src/index.css',
    'src/api/CertificateApi.ts', 'src/api/certificateContracts.ts', 'src/utils/certificateDates.ts', 'src/utils/visibleText.ts',
    'api/request-list.ts', 'api/request-certificate.ts', 'api/tsconfig.json',
    'server/certificateProxy.ts', 'server/viteCertificateProxy.ts', 'server/certificateValidation.ts',
    'src/components/layout/AppLayout.tsx',
    'src/components/certificates/CertificateRequestForm.tsx',
    'src/components/certificates/PurposeEditor.tsx',
    'src/components/certificates/purposeText.ts',
    'src/components/certificates/certificateRows.ts',
    'src/pages/NewRequestPage.tsx', 'src/pages/RequestsListPage.tsx', 'src/pages/NotFoundPage.tsx',
    'tests/certificateData.test.mjs', 'tests/purposeText.test.mjs', 'tests/secureApi.test.mjs', 'tests/devProxy.test.mjs',
    'tests/serverValidation.test.mjs', 'tests/purposeHtml.fixtures.mjs', 'tests/functionPackaging.test.mjs',
    'tests/portal.browser.cjs', 'tests/purpose.browser.cjs',
    'scripts/package-release.ps1', 'scripts/verify-browser-bundle.mjs'
)

# Compare locally configured credentials in memory; never print their values.
$credentials = @()
foreach ($name in @('ZALEX_API_KEY', ('VITE_' + 'ZALEX_API_KEY'))) {
    $value = [Environment]::GetEnvironmentVariable($name)
    if ($value) { $credentials += $value }
}
foreach ($environmentFile in (Get-ChildItem -LiteralPath $projectRoot -File -Force | Where-Object { $_.Name -eq '.env' -or $_.Name -like '.env.*' })) {
    foreach ($match in [regex]::Matches([System.IO.File]::ReadAllText($environmentFile.FullName), '(?m)^\s*(?:VITE_)?ZALEX_API_KEY\s*=\s*(.*)$')) {
        $value = $match.Groups[1].Value.Trim().Trim('"').Trim("'")
        if ($value) { $credentials += $value }
    }
}
foreach ($relative in $files) {
    $sourcePath = Join-Path $projectRoot $relative
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) { throw "Missing release file: $relative" }
    $content = [System.IO.File]::ReadAllText($sourcePath)
    foreach ($credential in $credentials) {
        if ($content.Contains($credential)) { throw "Credential detected in release file: $relative" }
    }
}
New-Item -ItemType Directory -Path $releaseDirectory -Force | Out-Null
if (Test-Path -LiteralPath $archivePath) {
    throw 'Release ZIP already exists. Rename it before creating a new verified archive.'
}
$archive = [System.IO.Compression.ZipFile]::Open($archivePath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($relative in $files) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $archive, (Join-Path $projectRoot $relative), $relative,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
} finally { $archive.Dispose() }
$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
    if ($archive.Entries.Count -ne $files.Count) { throw 'Unexpected release entry count.' }
    foreach ($entry in $archive.Entries) {
        if ($files -cnotcontains $entry.FullName) { throw 'Unexpected release entry.' }
        $reader = [System.IO.StreamReader]::new($entry.Open())
        try { $content = $reader.ReadToEnd() } finally { $reader.Dispose() }
        if ($content -cne [System.IO.File]::ReadAllText((Join-Path $projectRoot $entry.FullName))) {
            throw "Release content mismatch: $($entry.FullName)"
        }
        foreach ($credential in $credentials) {
            if ($content.Contains($credential)) { throw 'Credential detected in archived content.' }
        }
    }
} finally { $archive.Dispose() }
Write-Output "Verified release ZIP: release/zalex-certificate-portal.zip ($($files.Count) allowlisted files; configured credentials absent)."
