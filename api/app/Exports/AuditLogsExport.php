<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AuditLogsExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize
{
    public function __construct(private Collection $logs) {}

    public function collection(): Collection
    {
        return $this->logs->map(fn($log) => [
            'User'       => $log->user_name ?? 'System',
            'Role'       => $log->user_role ?? '',
            'Action'     => ucfirst($log->action),
            'Resource'   => class_basename($log->model_type ?? ''),
            'Resource ID'=> $log->model_id,
            'IP Address' => $log->ip_address,
            'Date & Time'=> \Carbon\Carbon::parse($log->created_at)
                               ->setTimezone('Africa/Mogadishu')
                               ->format('d M Y H:i'),
        ]);
    }

    public function headings(): array
    {
        return ['User', 'Role', 'Action', 'Resource', 'Resource ID', 'IP Address', 'Date & Time'];
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
