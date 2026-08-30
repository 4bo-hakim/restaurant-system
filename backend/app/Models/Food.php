<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Translatable\HasTranslations;

class Food extends Model
{
    use HasTranslations;
    protected $table = 'foods';
    public array $translatable = ['name', 'description'];

    protected $fillable = [
        'sub_category_id',
        'name',
        'description',
        'size',
        'price',
        'image_path',
        'is_available',
        'created_by',
    ];

    protected $casts = [
        'is_available' => 'boolean',
        'price' => 'integer',
    ];

    public function subCategory(): BelongsTo
    {
        return $this->belongsTo(SubCategory::class);
    }

    public function invoiceFoods(): HasMany
    {
        return $this->hasMany(InvoiceFood::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
