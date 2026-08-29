<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reservation extends Model
{
    protected $fillable = [
        'table_id',
        'name',
        'phone_number',
        'reservation_at',
        'reservation_end',
        'guest_count',
        'status',
        'note',
        'created_by',
    ];

    protected $casts = [
        'reservation_at' => 'datetime',
        'reservation_end' => 'datetime',
    ];

    public function table(): BelongsTo
    {
        return $this->belongsTo(RestaurantTable::class, 'table_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
