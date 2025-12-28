
Add-Type -AssemblyName System.Drawing

$sourcePath = "d:\Website\minecraft\gonn - Copy\frontend\src\assets\images\lower_third_hyrost.png"
$destFolder = "d:\Website\minecraft\gonn - Copy\frontend\src\assets\images"

Write-Host "Loading image from $sourcePath"
$image = [System.Drawing.Bitmap]::FromFile($sourcePath)
$width = $image.Width
$height = $image.Height
$partHeight = [int]($height / 3)

Write-Host "Image Dimensions: $width x $height"
Write-Host "Part Height: $partHeight"

for ($i = 0; $i -lt 3; $i++) {
    $y = $i * $partHeight
    # Adjust last part to ensure we get the rest of the image if not perfectly divisible
    $currentHeight = $partHeight
    if ($i -eq 2) { $currentHeight = $height - $y }

    $rect = New-Object System.Drawing.Rectangle 0, $y, $width, $currentHeight
    $destImage = $image.Clone($rect, $image.PixelFormat)
    
    $destPath = Join-Path $destFolder "lower_third_hyrost_$($i + 1).png"
    Write-Host "Saving part $($i + 1) to $destPath"
    $destImage.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destImage.Dispose()
}

$image.Dispose()
Write-Host "Done."
