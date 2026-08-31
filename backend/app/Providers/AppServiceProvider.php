<?php

namespace App\Providers;

use App\Models\InvoiceFood;
use App\Observers\InvoiceFoodObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        InvoiceFood::observe(InvoiceFoodObserver::class);
    }
}
