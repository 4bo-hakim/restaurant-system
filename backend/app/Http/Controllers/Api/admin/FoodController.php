<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\FoodRequest;
use App\Models\Food;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Storage;

class FoodController extends Controller
{
    public function index()
    {
        $foods = Food::with('subCategory')->get();

        return $this->success($foods, 'Foods retrieved successfully');
    }

    public function show($id)
    {
        $food = Food::with('subCategory')->find($id);

        if (! $food) {
            return $this->error('Food not found', 404);
        }

        return $this->success($food, 'Food retrieved successfully');
    }

    public function store(FoodRequest $request)
    {
        $validated = $request->validated();

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('foods', 'public');
        }

        $food = Food::create([
            'sub_category_id' => $validated['sub_category_id'],
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'size' => $validated['size'] ?? null,
            'price' => $validated['price'],
            'image_path' => $imagePath,
            'is_available' => $validated['is_available'] ?? true,
            'created_by' => auth()->id(),
        ]);

        return $this->success($food->load('subCategory'), 'Food created successfully', 201);
    }

    public function update(FoodRequest $request, $id)
    {
        $food = Food::find($id);

        if (! $food) {
            return $this->error('Food not found', 404);
        }

        $validated = $request->validated();

        if ($request->hasFile('image')) {
            if ($food->image_path && Storage::disk('public')->exists($food->image_path)) {
                Storage::disk('public')->delete($food->image_path);
            }

            $validated['image_path'] = $request->file('image')->store('foods', 'public');
        }

        $food->fill($validated);
        $food->save();

        return $this->success($food->fresh()->load('subCategory'), 'Food updated successfully');
    }

    public function destroy($id)
    {
        $food = Food::find($id);

        if (! $food) {
            return $this->error('Food not found', 404);
        }

        try {
            $food->delete();
        } catch (QueryException $e) {
            if (str_contains($e->getMessage(), 'FOREIGN KEY') || str_contains($e->getMessage(), 'constraint')) {
                return $this->error('Cannot delete food with existing order history', 409);
            }

            throw $e;
        }

        if ($food->image_path && Storage::disk('public')->exists($food->image_path)) {
            Storage::disk('public')->delete($food->image_path);
        }

        return $this->success(null, 'Food deleted successfully');
    }
}
