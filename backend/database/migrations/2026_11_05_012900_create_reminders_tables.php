<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Reminders a person sets on a task: at a fixed moment, or some
        // minutes before the due date (then they follow the due date).
        Schema::create('reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('remind_at');
            $table->unsignedInteger('offset_minutes')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['sent_at', 'remind_at']);
        });

        // Automatic alerts already sent, so each one goes out once per due date.
        Schema::create('task_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 30);
            $table->timestamp('due_at');
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['task_id', 'user_id', 'kind', 'due_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_alerts');
        Schema::dropIfExists('reminders');
    }
};
