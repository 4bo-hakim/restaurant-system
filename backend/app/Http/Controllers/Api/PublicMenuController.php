<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;

class PublicMenuController extends Controller
{
    public function index()
    {
        $categories = Category::with([
            'subCategories.foods' => function ($query) {
                $query->where('is_available', true);
            },
        ])->get();

        $menu = $categories
            ->map(function ($category) {
                $subCategories = $category->subCategories
                    ->filter(fn($subCategory) => $subCategory->foods->isNotEmpty())
                    ->values()
                    ->map(function ($subCategory) {
                        return [
                            'name' => $subCategory->name,
                            'image_path' => $subCategory->image_path,
                            'foods' => $subCategory->foods->map(function ($food) {
                                return [
                                    'name' => $food->name,
                                    'description' => $food->description,
                                    'size' => $food->size,
                                    'price' => $food->price,
                                    'image_path' => $food->image_path,
                                ];
                            })->values(),
                        ];
                    });

                if ($subCategories->isEmpty()) {
                    return null;
                }

                return [
                    'name' => $category->name,
                    'image_path' => $category->image_path,
                    'sub_categories' => $subCategories,
                ];
            })
            ->filter()
            ->values();

        return $this->success($menu, 'Menu retrieved successfully');
    }
}
