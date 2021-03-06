<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateUsersTable extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password', 60);
            $table->string('confirmation_code', 30)->nullable();
            $table->decimal('coins', 10, 2)->unsigned()->default(0);
            $table->smallInteger('website_count')->unsigned()->default(0);
            $table->integer('views_today')->unsigned()->default(0);
            $table->integer('views_total')->unsigned()->default(0);
            $table->decimal('health', 10, 2)->default(0);
            $table->decimal('health_max_daily_usage', 5, 2)->default(0);
            $table->boolean('human')->default(true);

            $table->integer('team_id')->unsigned()->nullable();
            $table->foreign('team_id')->references('id')->on('teams')->onDelete('set null');

            $table->rememberToken();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::drop('users');
    }
}
