<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\SubCategory;
use Illuminate\Database\Seeder;

class SubCategorySeeder extends Seeder
{
    public function run(): void
    {
        $foodCategory = Category::whereJsonContains('name->en', 'Food')->first();
        $drinksCategory = Category::whereJsonContains('name->en', 'Drinks')->first();

        if (!$foodCategory || !$drinksCategory) {
            $this->command->warn('Food or Drinks category not found. Make sure CategorySeeder runs first.');
            return;
        }

        $subCategories = [
            [
                'category_id' => $foodCategory->id,
                'name' => [
                    'en' => 'Pizza',
                    'ar' => 'بيتزا',
                    'ku' => 'پیزا',
                ],
                'image_path' => null,
                'created_by' => 1,
            ],
            [
                'category_id' => $foodCategory->id,
                'name' => [
                    'en' => 'Burgers',
                    'ar' => 'برغر',
                    'ku' => 'برگر',
                ],
                'image_path' => null,
                'created_by' => 1,
            ],
            [
                'category_id' => $drinksCategory->id,
                'name' => [
                    'en' => 'Cold Drinks',
                    'ar' => 'مشروبات باردة',
                    'ku' => 'خواردنەوەی سارد',
                ],
                'image_path' => null,
                'created_by' => 1,
            ],
            [
                'category_id' => $drinksCategory->id,
                'name' => [
                    'en' => 'Hot Drinks',
                    'ar' => 'مشروبات ساخنة',
                    'ku' => 'خواردنەوەی گەرم',
                ],
                'image_path' => null,
                'created_by' => 1,
            ],
        ];

        foreach ($subCategories as $subCategory) {
            SubCategory::firstOrCreate(
                ['category_id' => $subCategory['category_id'], 'name->en' => $subCategory['name']['en']],
                [
                    'name' => $subCategory['name'],
                    'image_path' => $subCategory['image_path'],
                    'created_by' => $subCategory['created_by'],
                ]
            );
        }
    }
}
