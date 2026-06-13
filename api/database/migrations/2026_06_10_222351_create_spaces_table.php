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
        Schema::create('spaces', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('type'); // conference_hall / office_space / educational_space
            $table->foreignId('floor_id')->constrained('floors');
            $table->integer('capacity')->nullable();
            $table->text('description')->nullable();
            $table->jsonb('amenities')->nullable();
            $table->decimal('base_price', 15, 2)->default(0);
            $table->string('price_unit'); // per_session / per_month / per_semester
            $table->jsonb('photos')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spaces');
    }
};
