@echo off
chcp 65001 > nul
echo Renomeando arquivos de imagem para os codigos correspondentes...

if exist "extracted_p5_img4.jpeg" ren "extracted_p5_img4.jpeg" "3351.jpeg"
if exist "extracted_p4_img4.jpeg" ren "extracted_p4_img4.jpeg" "3350.jpeg"
if exist "extracted_p3_img3.jpeg" ren "extracted_p3_img3.jpeg" "3349.jpeg"
if exist "extracted_p15_img2.jpeg" ren "extracted_p15_img2.jpeg" "3348.jpeg"
if exist "extracted_p13_img3.jpeg" ren "extracted_p13_img3.jpeg" "3347.jpeg"
if exist "extracted_p12_img5.jpeg" ren "extracted_p12_img5.jpeg" "3346.jpeg"
if exist "extracted_p17_img2.jpeg" ren "extracted_p17_img2.jpeg" "3345.jpeg"
if exist "extracted_p10_img3.jpeg" ren "extracted_p10_img3.jpeg" "3343.jpeg"
if exist "extracted_p16_img3.jpeg" ren "extracted_p16_img3.jpeg" "3342.jpeg"
if exist "extracted_p8_img3.jpeg" ren "extracted_p8_img3.jpeg" "3341.jpeg"
if exist "extracted_p7_img3.jpeg" ren "extracted_p7_img3.jpeg" "3340.jpeg"
if exist "extracted_p9_img3.jpeg" ren "extracted_p9_img3.jpeg" "3339.jpeg"

echo Processo concluido com sucesso!
pause