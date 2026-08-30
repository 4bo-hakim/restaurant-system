<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => [
                    'en' => 'Food',
                    'ar' => 'طعام',
                    'ku' => 'خواردن',
                ],
                'image_path' => null,
                'created_by' => 1,
            ],
            [
                'name' => [
                    'en' => 'Drinks',
                    'ar' => 'مشروبات',
                    'ku' => 'خواردنەوە',
                ],
                'image_path' => null,
                'created_by' => 1,
            ],
            [
                'name' => [
                    'en' => 'Desserts',
                    'ar' => 'حلويات',
                    'ku' => 'شیرینی',
                ],
                'image_path' => null,
                'created_by' => 1,
            ],
        ];

        foreach ($categories as $category) {
            Category::firstOrCreate(
                ['name->en' => $category['name']['en']],
                [
                    'name' => $category['name'],
                    'image_path' => $category['image_path'],
                    'created_by' => $category['created_by'],
                ]
            );
        }
    }
}
