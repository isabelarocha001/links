Add-Type -AssemblyName System.Drawing

$output = Join-Path $PSScriptRoot '..\public\og-links.jpg'
$bitmap = [System.Drawing.Bitmap]::new(1200, 630)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([System.Drawing.Color]::FromArgb(10, 10, 12))

$purple = [System.Drawing.Color]::FromArgb(192, 132, 252)
$panel = [System.Drawing.Rectangle]::new(56, 56, 1088, 518)
$panelBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  $panel,
  [System.Drawing.Color]::FromArgb(28, 20, 38),
  [System.Drawing.Color]::FromArgb(13, 13, 17),
  20
)
$graphics.FillRectangle($panelBrush, $panel)
$graphics.DrawRectangle([System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(80, $purple), 2), $panel)

# Oversized link mark: two interlocked rounded links.
$iconPen = [System.Drawing.Pen]::new($purple, 15)
$iconPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$iconPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$graphics.DrawArc($iconPen, 454, 126, 126, 86, 35, 285)
$graphics.DrawArc($iconPen, 520, 126, 126, 86, 215, 285)
$graphics.DrawLine($iconPen, 520, 177, 580, 177)

$white = [System.Drawing.Brushes]::White
$muted = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(205, 190, 203, 217))
$titleFont = [System.Drawing.Font]::new('Segoe UI', 40, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$subFont = [System.Drawing.Font]::new('Segoe UI', 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$brandFont = [System.Drawing.Font]::new('Segoe UI', 17, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

$title = 'Links das minhas redes sociais pagas'
$titleSize = $graphics.MeasureString($title, $titleFont)
$graphics.DrawString($title, $titleFont, $white, (1200 - $titleSize.Width) / 2, 310)
$subtitle = 'Tudo meu em um so lugar'
$subtitleSize = $graphics.MeasureString($subtitle, $subFont)
$graphics.DrawString($subtitle, $subFont, $muted, (1200 - $subtitleSize.Width) / 2, 382)
$graphics.DrawString('WANESSA  |  LINKS', $brandFont, [System.Drawing.SolidBrush]::new($purple), 501, 500)

$bitmap.Save([System.IO.Path]::GetFullPath($output), [System.Drawing.Imaging.ImageFormat]::Jpeg)
$graphics.Dispose()
$bitmap.Dispose()
$panelBrush.Dispose()
$iconPen.Dispose()
$titleFont.Dispose()
$subFont.Dispose()
$brandFont.Dispose()
$muted.Dispose()
Write-Output "Created $([System.IO.Path]::GetFullPath($output))"
