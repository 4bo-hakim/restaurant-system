<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Translatable\HasTranslations;

class SubCategory extends Model
{
    use HasTranslations;

    protected $table = 'sub_categories';

    public array $translatable = ['name'];

    protected $fillable = [
        'category_id',
        'name',
        'image_path',
        'created_by',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function foods(): HasMany
    {
        return $this->hasMany(Food::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
