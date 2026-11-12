Add-Type -AssemblyName System.Drawing

function New-RoundPath([double]$x, [double]$y, [double]$w, [double]$h, [double]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc([float]$x, [float]$y, [float]$d, [float]$d, 180, 90)
  $p.AddArc([float]($x + $w - $d), [float]$y, [float]$d, [float]$d, 270, 90)
  $p.AddArc([float]($x + $w - $d), [float]($y + $h - $d), [float]$d, [float]$d, 0, 90)
  $p.AddArc([float]$x, [float]($y + $h - $d), [float]$d, [float]$d, 90, 90)
  $p.CloseFigure()
  return $p
}

function New-Icon([int]$size, [string]$out, [bool]$maskable) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  $full = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $full,
    [System.Drawing.Color]::FromArgb(227, 169, 95),
    [System.Drawing.Color]::FromArgb(200, 132, 60),
    45.0
  )

  if ($maskable) {
    $g.FillRectangle($grad, $full)
  } else {
    $bg = New-RoundPath 0 0 $size $size ($size * 0.219)
    $g.FillPath($grad, $bg)
    $bg.Dispose()
  }

  $k = $size / 512.0
  if ($maskable) {
    $k = $k * 0.78
    $offset = ($size - 512 * $k) / 2.0
    $g.TranslateTransform([float]$offset, [float]$offset)
  }
  $g.ScaleTransform([float]$k, [float]$k)

  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(251, 243, 230))
  $light = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(241, 226, 202))
  $violet = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(26, 23, 18))
  $cyan = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(179, 69, 47))
  $pale = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(217, 195, 163))
  $pale2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(231, 214, 189))

  # "кольца" календаря
  $r1 = New-RoundPath 150 96 34 66 17
  $g.FillPath($white, $r1)
  $r2 = New-RoundPath 328 96 34 66 17
  $g.FillPath($white, $r2)

  # корпус календаря
  $cal = New-RoundPath 96 128 320 288 52
  $g.FillPath($white, $cal)

  # шапка
  $clip = $cal.Clone()
  $g.SetClip($clip)
  $g.FillRectangle($light, 96, 128, 320, 88)
  $g.ResetClip()

  # полосы смен (разделённая смена: фиолетовая + голубая)
  $b1 = New-RoundPath 140 252 104 30 15
  $g.FillPath($violet, $b1)
  $b2 = New-RoundPath 256 252 116 30 15
  $g.FillPath($cyan, $b2)
  $b3 = New-RoundPath 140 304 232 26 13
  $g.FillPath($pale, $b3)
  $b4 = New-RoundPath 140 350 152 26 13
  $g.FillPath($pale2, $b4)

  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Write-Output "OK $out"
}

$dir = Join-Path (Split-Path $PSScriptRoot -Parent) 'icons'
New-Icon 192 (Join-Path $dir 'icon-192.png') $false
New-Icon 512 (Join-Path $dir 'icon-512.png') $false
New-Icon 180 (Join-Path $dir 'icon-180.png') $false
New-Icon 512 (Join-Path $dir 'icon-maskable-512.png') $true



