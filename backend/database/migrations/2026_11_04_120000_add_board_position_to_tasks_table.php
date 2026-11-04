<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kanban order gets its own column: subtasks also appear on the board, and
     * their `position` already orders them inside their parent task.
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->unsignedInteger('board_position')->default(0)->after('position');
            $table->index(['workspace_id', 'status_id', 'board_position']);
        });

        DB::table('tasks')->whereNull('parent_id')->update(['board_position' => DB::raw('position')]);
        // Subtasks start at the bottom of their column, in their parent's order.
        DB::table('tasks')->whereNotNull('parent_id')->update(['board_position' => DB::raw('position + 10000')]);
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['workspace_id', 'status_id', 'board_position']);
            $table->dropColumn('board_position');
        });
    }
};
