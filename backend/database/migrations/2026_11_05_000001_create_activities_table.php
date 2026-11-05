<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Who did what and when: the history of each task (and, later, the
     * workspace feed). Rows outlive their task, so the title is kept too.
     */
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('task_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event', 40);
            $table->string('subject')->nullable();
            $table->json('changes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['task_id', 'id']);
            $table->index(['workspace_id', 'id']);
        });

        // Existing tasks start their history with what is already known.
        DB::table('tasks')->orderBy('id')->each(function (object $task) {
            DB::table('activities')->insert([
                'workspace_id' => $task->workspace_id,
                'task_id' => $task->id,
                'user_id' => $task->created_by,
                'event' => 'created',
                'subject' => $task->title,
                'created_at' => $task->created_at,
            ]);
            if ($task->completed_at) {
                DB::table('activities')->insert([
                    'workspace_id' => $task->workspace_id,
                    'task_id' => $task->id,
                    'user_id' => $task->created_by,
                    'event' => 'updated',
                    'subject' => $task->title,
                    'changes' => json_encode(['completed_at' => [null, date(DATE_ATOM, strtotime($task->completed_at.' UTC'))]]),
                    'created_at' => $task->completed_at,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
