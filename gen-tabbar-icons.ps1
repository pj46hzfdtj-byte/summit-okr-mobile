# 生成 tabBar 图标：4 个 tab × (普通灰 / 选中蓝)，81x81 PNG
Add-Type -AssemblyName System.Drawing
$out = "c:\Users\Administrator\Documents\trae_projects\111\mianshi\summit-okr-mobile\src\static\tabbar"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$size = 81
$gray = [System.Drawing.Color]::FromArgb(255, 138, 138, 138)
$blue = [System.Drawing.Color]::FromArgb(255, 64, 158, 255)

function New-Canvas([System.Drawing.Color]$c) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $pen = New-Object System.Drawing.Pen($c, 5)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $brush = New-Object System.Drawing.SolidBrush($c)
  return @($bmp, $g, $pen, $brush)
}

function Draw-Dashboard($g, $pen, $brush) {
  # 四宫格圆角块
  $g.FillRectangle($brush, 14, 14, 22, 22)
  $g.FillRectangle($brush, 45, 14, 22, 22)
  $g.FillRectangle($brush, 14, 45, 22, 22)
  $g.DrawRectangle($pen, 45, 45, 22, 22)
}

function Draw-Target($g, $pen, $brush) {
  $g.DrawEllipse($pen, 14, 14, 53, 53)
  $g.DrawEllipse($pen, 26, 26, 29, 29)
  $g.FillEllipse($brush, 35, 35, 11, 11)
}

function Draw-Calendar($g, $pen, $brush) {
  $g.DrawRectangle($pen, 14, 20, 53, 47)
  $g.DrawLine($pen, 14, 34, 67, 34)
  $g.DrawLine($pen, 28, 12, 28, 24)
  $g.DrawLine($pen, 53, 12, 53, 24)
  $g.FillEllipse($brush, 24, 42, 9, 9)
  $g.FillEllipse($brush, 37, 42, 9, 9)
}

function Draw-Person($g, $pen, $brush) {
  $g.DrawEllipse($pen, 28, 12, 25, 25)
  $g.DrawArc($pen, 12, 44, 57, 48, 180, 180)
}

$drawers = @{
  summary = { param($g,$pen,$b) Draw-Dashboard $g $pen $b }
  goals   = { param($g,$pen,$b) Draw-Target $g $pen $b }
  tasks   = { param($g,$pen,$b) Draw-Calendar $g $pen $b }
  profile = { param($g,$pen,$b) Draw-Person $g $pen $b }
}

foreach ($name in $drawers.Keys) {
  foreach ($state in @(@('gray', $gray), @('blue', $blue))) {
    $bmp, $g, $pen, $brush = New-Canvas $state[1]
    & $drawers[$name] $g $pen $brush
    $suffix = if ($state[0] -eq 'gray') { '' } else { '-active' }
    $path = Join-Path $out ("$name$suffix.png")
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $pen.Dispose(); $brush.Dispose()
    Write-Output "saved $path"
  }
}
