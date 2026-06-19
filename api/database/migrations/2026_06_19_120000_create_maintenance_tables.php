<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('maintenance_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_code')->unique();
            $table->string('title');
            $table->string('category')->default('other'); // ac|electrical|cleaning|plumbing|equipment|other
            $table->string('priority')->default('normal'); // low|normal|high
            $table->text('description')->nullable();        // "before" notes
            $table->foreignId('space_id')->nullable()->constrained('spaces')->nullOnDelete();
            $table->string('location_text')->nullable();    // free-text area (common areas)
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('status')->default('open');       // open|in_progress|resolved|cancelled
            $table->string('job_type')->nullable();          // internal|outsourced
            $table->foreignId('assigned_employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->foreignId('vendor_bill_id')->nullable()->constrained('vendor_bills')->nullOnDelete();
            $table->decimal('estimated_cost', 12, 2)->nullable();
            $table->text('resolution_notes')->nullable();    // "after" notes
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('maintenance_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('maintenance_request_id')->constrained()->cascadeOnDelete();
            $table->string('phase')->default('before'); // before|after
            $table->string('file_url');                 // S3 object key
            $table->string('caption')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_photos');
        Schema::dropIfExists('maintenance_requests');
    }
};
