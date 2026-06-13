<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class GenericReportExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize, WithTitle
{
    public function __construct(
        private string $reportTitle,
        private array $headers,
        private array $rows
    ) {}

    public function collection(): Collection
    {
        return collect($this->rows);
    }

    public function headings(): array
    {
        return $this->headers;
    }

    public function title(): string
    {
        return substr($this->reportTitle, 0, 30);
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font'      => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                'fill'      => ['fillType' => 'solid', 'startColor' => ['argb' => 'FF1B2D4F']],
                'alignment' => ['horizontal' => 'center'],
            ],
        ];
    }
}
