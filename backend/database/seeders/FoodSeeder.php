<?php

namespace Database\Seeders;

use App\Models\Food;
use App\Models\SubCategory;
use Illuminate\Database\Seeder;

class FoodSeeder extends Seeder
{
    public function run(): void
    {
        $pizza = SubCategory::whereJsonContains('name->en', 'Pizza')->first();
        $burgers = SubCategory::whereJsonContains('name->en', 'Burgers')->first();
        $coldDrinks = SubCategory::whereJsonContains('name->en', 'Cold Drinks')->first();
        $hotDrinks = SubCategory::whereJsonContains('name->en', 'Hot Drinks')->first();

        if (!$pizza || !$burgers || !$coldDrinks || !$hotDrinks) {
            $this->command->warn('One or more sub-categories not found. Make sure SubCategorySeeder runs first.');
            return;
        }

        $foods = [
            [
                'sub_category_id' => $pizza->id,
                'name' => [
                    'en' => 'Margherita',
                    'ar' => 'مارغريتا',
                    'ku' => 'مارگریتا',
                ],
                'description' => null,
                'size' => 'Small',
                'price' => 6000,
                'image_path' => null,
                'is_available' => true,
                'created_by' => 1,
            ],
            [
                'sub_category_id' => $pizza->id,
                'name' => [
                    'en' => 'Margherita',
                    'ar' => 'مارغريتا',
                    'ku' => 'مارگریتا',
                ],
                'description' => null,
                'size' => 'Large',
                'price' => 10000,
                'image_path' => null,
                'is_available' => true,
                'created_by' => 1,
            ],
            [
                'sub_category_id' => $burgers->id,
                'name' => [
                    'en' => 'Chicken Burger',
                    'ar' => 'برغر دجاج',
                    'ku' => 'برگری مریشک',
                ],
                'description' => null,
                'size' => null,
                'price' => 5000,
                'image_path' => null,
                'is_available' => true,
                'created_by' => 1,
            ],
            [
                'sub_category_id' => $coldDrinks->id,
                'name' => [
                    'en' => 'Pepsi',
                    'ar' => 'بيبسي',
                    'ku' => 'پێپسی',
                ],
                'description' => null,
                'size' => null,
                'price' => 1500,
                'image_path' => null,
                'is_available' => true,
                'created_by' => 1,
            ],
            [
                'sub_category_id' => $hotDrinks->id,
                'name' => [
                    'en' => 'Tea',
                    'ar' => 'شاي',
                    'ku' => 'چا',
                ],
                'description' => null,
                'size' => null,
                'price' => 1000,
                'image_path' => null,
                'is_available' => true,
                'created_by' => 1,
            ],
        ];

        foreach ($foods as $food) {
            Food::firstOrCreate(
                [
                    'sub_category_id' => $food['sub_category_id'],
                    'name->en' => $food['name']['en'],
                    'size' => $food['size'],
                ],
                [
                    'name' => $food['name'],
                    'description' => $food['description'],
                    'size' => $food['size'],
                    'price' => $food['price'],
                    'image_path' => $food['image_path'],
                    'is_available' => $food['is_available'],
                    'created_by' => $food['created_by'],
                ]
            );
        }
    }
}
