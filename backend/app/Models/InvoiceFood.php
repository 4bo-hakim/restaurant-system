<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceFood extends Model
{
    protected $table = 'invoice_food';

    protected $fillable = [
        'invoice_id',
        'food_id',
        'person_number',
        'quantity',
        'unit_price',
        'status',
        'note',
    ];

    protected $casts = [
        'unit_price' => 'integer',
        'quantity' => 'integer',
        'person_number' => 'integer',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function food(): BelongsTo
    {
        return $this->belongsTo(Food::class);
    }
}
