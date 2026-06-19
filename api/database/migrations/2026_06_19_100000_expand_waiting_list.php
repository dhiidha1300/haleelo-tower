<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('waiting_list', function (Blueprint $table) {
            $table->string('status')->default('waiting')->after('client_phone'); // waiting|cancelled|converted|expired
            $table->string('notify_channel')->default('email')->after('status'); // email|whatsapp|both
            $table->unsignedInteger('position')->default(1)->after('notify_channel');
            $table->foreignId('created_by')->nullable()->after('position')->constrained('users')->nullOnDelete();
            $table->foreignId('converted_booking_id')->nullable()->after('created_by')->constrained('bookings')->nullOnDelete();
            $table->timestamp('slot_opened_at')->nullable()->after('notified_at');
            $table->text('notes')->nullable()->after('slot_opened_at');
        });
    }

    public function down(): void
    {
        Schema::table('waiting_list', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropConstrainedForeignId('converted_booking_id');
            $table->dropColumn(['status', 'notify_channel', 'position', 'slot_opened_at', 'notes']);
        });
    }
};
