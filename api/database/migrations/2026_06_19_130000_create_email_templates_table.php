<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_templates', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();          // slug, e.g. password_reset
            $table->string('name');                    // human label
            $table->string('subject');                 // may contain {{variables}}
            $table->longText('body_html');             // inner body (wrapped in brand frame)
            $table->json('variables')->nullable();     // allowed placeholders for the editor
            $table->boolean('is_system')->default(false); // protected: edit-only, never deletable
            $table->boolean('is_active')->default(true);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_templates');
    }
};
