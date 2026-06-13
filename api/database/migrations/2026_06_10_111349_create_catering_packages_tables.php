<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('catering_packages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->decimal('base_price', 15, 2)->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('catering_package_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('package_id')->constrained('catering_packages')->onDelete('cascade');
            $table->string('service_name');
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catering_package_items');
        Schema::dropIfExists('catering_packages');
    }
};
