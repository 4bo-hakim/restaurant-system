<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\SubCategoryRequest;
use App\Models\SubCategory;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Storage;

class SubCategoryController extends Controller
{
    public function index()
    {
        $subCategories = SubCategory::with('category')->withCount('foods')->get();

        return $this->success($subCategories, 'Sub-categories retrieved successfully');
    }

    public function show($id)
    {
        $subCategory = SubCategory::with('category')->with('foods')->find($id);

        if (! $subCategory) {
            return $this->error('Sub-category not found', 404);
        }

        return $this->success($subCategory, 'Sub-category retrieved successfully');
    }

    public function store(SubCategoryRequest $request)
    {
        $validated = $request->validated();

        $imagePath = null;
        if ($request->hasFile('image_path')) {
            $imagePath = $request->file('image_path')->store('subcategories', 'public');
        }

        $subCategory = SubCategory::create([
            'category_id' => $validated['category_id'],
            'name' => $validated['name'],
            'image_path' => $imagePath,
            'created_by' => auth()->id(),
        ]);

        return $this->success($subCategory->load('category')->load('foods'), 'Sub-category created successfully', 201);
    }

    public function update(SubCategoryRequest $request, $id)
    {
        $subCategory = SubCategory::find($id);

        if (! $subCategory) {
            return $this->error('Sub-category not found', 404);
        }

        $validated = $request->validated();

        if ($request->hasFile('image_path')) {
            if ($subCategory->image_path && Storage::disk('public')->exists($subCategory->image_path)) {
                Storage::disk('public')->delete($subCategory->image_path);
            }

            $validated['image_path'] = $request->file('image_path')->store('subcategories', 'public');
        }

        $subCategory->fill($validated);
        $subCategory->save();

        return $this->success($subCategory->fresh()->load('category')->load('foods'), 'Sub-category updated successfully');
    }

    public function destroy($id)
    {
        $subCategory = SubCategory::find($id);

        if (! $subCategory) {
            return $this->error('Sub-category not found', 404);
        }

        try {
            $subCategory->delete();
        } catch (QueryException $e) {
            if (str_contains($e->getMessage(), 'FOREIGN KEY') || str_contains($e->getMessage(), 'constraint')) {
                return $this->error('Cannot delete sub-category with existing foods', 409);
            }

            throw $e;
        }

        if ($subCategory->image_path && Storage::disk('public')->exists($subCategory->image_path)) {
            Storage::disk('public')->delete($subCategory->image_path);
        }

        return $this->success(null, 'Sub-category deleted successfully');
    }
}
