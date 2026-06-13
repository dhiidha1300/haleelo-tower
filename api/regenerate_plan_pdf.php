<?php
/**
 * One-off: regenerate the Implementation Plan PDF from the markdown.
 * Uses league/commonmark (MD->HTML) + dompdf (HTML->PDF), both already vendored.
 * Run:  php regenerate_plan_pdf.php
 */

require __DIR__ . '/vendor/autoload.php';

ini_set('memory_limit', '1024M');
ini_set('max_execution_time', '600');

use League\CommonMark\CommonMarkConverter;
use Dompdf\Dompdf;
use Dompdf\Options;

$mdPath  = 'D:/haleelo-tower/Planning/IMPLEMENTATION_PLAN.md';
$pdfPath = 'D:/haleelo-tower/Planning/Haleelo Tower — Platform Implementation Plan v3.0.pdf';

$markdown = file_get_contents($mdPath);

$converter = new CommonMarkConverter(['html_input' => 'allow', 'allow_unsafe_links' => false]);
$body = $converter->convert($markdown)->getContent();

$css = <<<CSS
* { font-family: DejaVu Sans, sans-serif; }
body { font-size: 10.5px; color: #222; line-height: 1.45; }
h1 { color: #1B2D4F; font-size: 19px; border-bottom: 2px solid #C9A052; padding-bottom: 4px; margin-top: 22px; }
h2 { color: #1B2D4F; font-size: 15px; margin-top: 18px; }
h3 { color: #C9A052; font-size: 12.5px; margin-top: 14px; }
table { width: 100%; border-collapse: collapse; margin: 10px 0; }
th { background: #1B2D4F; color: #fff; text-align: left; padding: 5px 7px; font-size: 9px; }
td { border: 1px solid #e2e2e2; padding: 4px 7px; font-size: 9px; vertical-align: top; }
tr:nth-child(even) td { background: #f7f7f7; }
code { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 9px; }
pre { background: #1B2D4F; color: #e6edf3; padding: 10px; border-radius: 6px; font-size: 8.5px; white-space: pre-wrap; }
pre code { background: transparent; color: #e6edf3; }
ul, ol { margin: 6px 0 6px 18px; }
li { margin: 2px 0; }
hr { border: 0; border-top: 1px solid #ddd; margin: 16px 0; }
a { color: #1B2D4F; text-decoration: none; }
CSS;

$html = "<!DOCTYPE html><html><head><meta charset='utf-8'><style>{$css}</style></head><body>{$body}</body></html>";

$options = new Options();
$options->set('isRemoteEnabled', false);
$options->set('defaultFont', 'DejaVu Sans');
$dompdf = new Dompdf($options);
$dompdf->loadHtml($html, 'UTF-8');
$dompdf->setPaper('A4', 'portrait');
$dompdf->render();

// Footer page numbers
$canvas = $dompdf->getCanvas();
$canvas->page_text(520, 810, 'Page {PAGE_NUM} / {PAGE_COUNT}', null, 8, [0.5, 0.5, 0.5]);

file_put_contents($pdfPath, $dompdf->output());

echo "PDF regenerated: {$pdfPath}\n";
echo 'Size: ' . round(filesize($pdfPath) / 1024) . " KB\n";
