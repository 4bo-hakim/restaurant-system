<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    protected $fillable = [
        'table_id',
        'created_by',
        'status',
        'discount',
        'total',
    ];

    protected $casts = [
        'discount' => 'integer',
        'total' => 'integer',
    ];

    public function table(): BelongsTo
    {
        return $this->belongsTo(RestaurantTable::class, 'table_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function invoiceFoods(): HasMany
    {
        return $this->hasMany(InvoiceFood::class);
    }
}
