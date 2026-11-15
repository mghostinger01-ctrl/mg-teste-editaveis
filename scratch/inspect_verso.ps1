Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap("assets/rg_verso_bg.png")
Write-Host "Verso size: $($bmp.Width) x $($bmp.Height)"
# Sample some pixels
$c1 = $bmp.GetPixel(50, 50)
$c2 = $bmp.GetPixel(300, 200)
Write-Host "Pixel 50,50: $($c1.R),$($c1.G),$($c1.B)"
Write-Host "Pixel 300,200: $($c2.R),$($c2.G),$($c2.B)"
$bmp.Dispose()