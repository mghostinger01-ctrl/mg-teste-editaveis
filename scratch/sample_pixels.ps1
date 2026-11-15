Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap('assets/rg_verso_template_clean.png')

$darkCount = 0
function Find-Dark($name, $x1, $y1, $x2, $y2) {
    for ($x=$x1; $x -le $x2; $x++) {
        for ($y=$y1; $y -le $y2; $y++) {
            $c = $bmp.GetPixel($x, $y)
            $lum = [int]($c.R*0.299 + $c.G*0.587 + $c.B*0.114)
            if ($lum -lt 140) {
                $script:darkCount++
                Write-Host "${name} at X=${x} Y=${y}: Lum=${lum} (R=$($c.R), G=$($c.G), B=$($c.B))"
            }
        }
    }
}

Find-Dark "Pai" 314 115 550 135
Find-Dark "Mae" 314 140 620 167
Find-Dark "Orgao" 314 295 400 320
Find-Dark "Local" 314 414 470 435
Find-Dark "Data" 685 414 780 435
Find-Dark "Sig" 297 446 685 480

Write-Host "Total dark pixels found in text areas: $darkCount"

$bmp.Dispose()


