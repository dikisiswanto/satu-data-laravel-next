<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('app:health', function () {
    $this->info('Portal Satu Data Kabupaten Wajo API is ready.');
})->purpose('Check that the Laravel application can boot.');
