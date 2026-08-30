<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\CategoryRequest;
use App\Models\Category;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Storage;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::withCount('subCategories')->get();

        return $this->success($categories, 'Categories retrieved successfully');
    }

    public function show($id)
    {
        $category = Category::with('subCategories')->find($id);

        if (! $category) {
            return $this->error('Category not found', 404);
        }

        return $this->success($category, 'Category retrieved successfully');
    }

    public function store(CategoryRequest $request)
    {
        $validated = $request->validated();

        $imagePath = null;
        if ($request->hasFile('image_path')) {
            $imagePath = $request->file('image_path')->store('categories', 'public');
        }

        $category = Category::create([
            'name' => $validated['name'],
            'image_path' => $imagePath,
            'created_by' => auth()->id(),
        ]);

        return $this->success($category->load('subCategories'), 'Category created successfully', 201);
    }

    public function update(CategoryRequest $request, $id)
    {
        $category = Category::find($id);

        if (! $category) {
            return $this->error('Category not found', 404);
        }

        $validated = $request->validated();

        if ($request->hasFile('image_path')) {
            if ($category->image_path && Storage::disk('public')->exists($category->image_path)) {
                Storage::disk('public')->delete($category->image_path);
            }

            $validated['image_path'] = $request->file('image_path')->store('categories', 'public');
        }

        $category->fill($validated);
        $category->save();

        return $this->success($category->fresh()->load('subCategories'), 'Category updated successfully');
    }

    public function destroy($id)
    {
        $category = Category::find($id);

        if (! $category) {
            return $this->error('Category not found', 404);
        }

        try {
            $category->delete();
        } catch (QueryException $e) {
            if (str_contains($e->getMessage(), 'FOREIGN KEY') || str_contains($e->getMessage(), 'constraint')) {
                return $this->error('Cannot delete category with existing sub-categories', 409);
            }

            throw $e;
        }

        if ($category->image_path && Storage::disk('public')->exists($category->image_path)) {
            Storage::disk('public')->delete($category->image_path);
        }

        return $this->success(null, 'Category deleted successfully');
    }
}
