
Add-Type -AssemblyName System.Drawing

$sourcePath = "C:/Users/Admin/.gemini/antigravity/brain/dcd778c1-daef-4f5c-999a-90a3cb4e62f8/hyrost_lower_third_exact_clean_1765516239925.png"
$destFolder = "d:\Website\minecraft\gonn - Copy\frontend\src\assets\images"
$names = @("lower_third_hyrost_exact_1", "lower_third_hyrost_exact_2", "lower_third_hyrost_exact_3")

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
    
    $destPath = Join-Path $destFolder "$($names[$i]).png"
    Write-Host "Saving part $($i + 1) to $destPath"
    $destImage.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destImage.Dispose()
}

$image.Dispose()
Write-Host "Done."
