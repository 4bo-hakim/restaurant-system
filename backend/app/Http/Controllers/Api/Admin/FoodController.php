<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\FoodRequest;
use App\Models\Food;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class FoodController extends Controller
{
    public function index()
    {
        $request = request();

        $validator = Validator::make($request->query(), [
            'sub_category_id' => ['nullable', 'integer'],
            'is_available' => ['nullable', 'in:true,false,1,0'],
            'search' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return $this->error('Invalid food filters', 422, $validator->errors());
        }

        $filters = $validator->validated();
        $isAvailable = isset($filters['is_available'])
            ? in_array($filters['is_available'], ['true', '1'], true)
            : null;

        $foodQuery = Food::with('subCategory')
            ->when(array_key_exists('sub_category_id', $filters), fn($query) => $query->where('sub_category_id', $filters['sub_category_id']))
            ->when($isAvailable !== null, fn($query) => $query->where('is_available', $isAvailable))
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name->en', 'like', "%{$search}%")
                        ->orWhere('name->ar', 'like', "%{$search}%")
                        ->orWhere('name->ku', 'like', "%{$search}%");
                });
            });

        $foods = auth()->user()->hasRole('admin')
            ? $foodQuery->paginate(20)
            : $foodQuery->get();

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
        if ($request->hasFile('image_path')) {
            $imagePath = $request->file('image_path')->store('foods', 'public');
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

        if ($request->hasFile('image_path')) {
            if ($food->image_path && Storage::disk('public')->exists($food->image_path)) {
                Storage::disk('public')->delete($food->image_path);
            }

            $validated['image_path'] = $request->file('image_path')->store('foods', 'public');
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
