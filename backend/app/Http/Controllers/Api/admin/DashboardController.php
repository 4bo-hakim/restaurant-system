<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function summary(Request $request)
    {
        $dateRange = $this->dateRange($request);

        if ($dateRange instanceof JsonResponse) {
            return $dateRange;
        }

        $completedInvoices = Invoice::where('status', 'completed')
            ->whereBetween('created_at', $dateRange);

        $totalRevenue = (int) (clone $completedInvoices)->sum('total');
        $completedOrders = (int) (clone $completedInvoices)->count();

        return $this->success([
            'total_revenue' => $totalRevenue,
            'total_completed_orders' => $completedOrders,
            'total_discount_given' => (int) (clone $completedInvoices)->sum('discount'),
            'average_order_value' => $completedOrders > 0 ? $totalRevenue / $completedOrders : 0,
            'active_tables' => Invoice::where('status', 'pending')
                ->distinct('table_id')
                ->count('table_id'),
        ], 'Dashboard summary retrieved successfully');
    }

    public function topItems(Request $request)
    {
        $dateRange = $this->dateRange($request);

        if ($dateRange instanceof JsonResponse) {
            return $dateRange;
        }

        $items = DB::table('invoice_food')
            ->join('invoices', 'invoices.id', '=', 'invoice_food.invoice_id')
            ->join('foods', 'foods.id', '=', 'invoice_food.food_id')
            ->where('invoices.status', 'completed')
            ->whereBetween('invoices.created_at', $dateRange)
            ->select(
                'invoice_food.food_id',
                'foods.name as food_name',
                DB::raw('SUM(invoice_food.quantity) as total_quantity_sold'),
                DB::raw('SUM(invoice_food.unit_price * invoice_food.quantity) as total_revenue')
            )
            ->groupBy('invoice_food.food_id', 'foods.name')
            ->orderByDesc('total_quantity_sold')
            ->limit((int) $request->input('limit', 5))
            ->get()
            ->map(function ($item) {
                return [
                    'food_id' => $item->food_id,
                    'food_name' => $this->translatedName($item->food_name),
                    'total_quantity_sold' => (int) $item->total_quantity_sold,
                    'total_revenue' => (int) $item->total_revenue,
                ];
            });

        return $this->success($items, 'Top items retrieved successfully');
    }

    public function revenueByCategory(Request $request)
    {
        $dateRange = $this->dateRange($request);

        if ($dateRange instanceof JsonResponse) {
            return $dateRange;
        }

        $categories = DB::table('invoice_food')
            ->join('invoices', 'invoices.id', '=', 'invoice_food.invoice_id')
            ->join('foods', 'foods.id', '=', 'invoice_food.food_id')
            ->join('sub_categories', 'sub_categories.id', '=', 'foods.sub_category_id')
            ->join('categories', 'categories.id', '=', 'sub_categories.category_id')
            ->where('invoices.status', 'completed')
            ->whereBetween('invoices.created_at', $dateRange)
            ->select(
                'categories.id as category_id',
                'categories.name as category_name',
                DB::raw('SUM(invoice_food.unit_price * invoice_food.quantity) as total_revenue')
            )
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('total_revenue')
            ->get()
            ->map(function ($category) {
                return [
                    'category_id' => $category->category_id,
                    'category_name' => $this->translatedName($category->category_name),
                    'total_revenue' => (int) $category->total_revenue,
                ];
            });

        return $this->success($categories, 'Revenue by category retrieved successfully');
    }

    public function reservationsSummary(Request $request)
    {
        $dateRange = $this->dateRange($request);

        if ($dateRange instanceof JsonResponse) {
            return $dateRange;
        }

        $statuses = ['pending', 'confirmed', 'cancelled', 'completed'];
        $counts = Reservation::whereBetween('reservation_at', $dateRange)
            ->whereIn('status', $statuses)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        return $this->success(collect($statuses)->mapWithKeys(function ($status) use ($counts) {
            return [$status => (int) ($counts[$status] ?? 0)];
        }), 'Reservations summary retrieved successfully');
    }

    private function dateRange(Request $request): array|JsonResponse
    {
        $today = CarbonImmutable::today();
        $from = $request->query('from', $today->format('Y-m-d'));
        $to = $request->query('to', $today->format('Y-m-d'));

        try {
            $fromDate = CarbonImmutable::createFromFormat('!Y-m-d', $from);
            $toDate = CarbonImmutable::createFromFormat('!Y-m-d', $to);

            if (
                $fromDate === false || $toDate === false
                || $fromDate->format('Y-m-d') !== $from
                || $toDate->format('Y-m-d') !== $to
            ) {
                throw new \Exception();
            }
        } catch (\Throwable) {
            return $this->error('The from and to dates must use the Y-m-d format.', 422);
        }

        if ($fromDate->isAfter($toDate)) {
            return $this->error('The from date must not be after the to date.', 422);
        }

        return [$fromDate->startOfDay(), $toDate->endOfDay()];
    }

    private function translatedName(string $name): string
    {
        $translations = json_decode($name, true) ?: [];
        $locale = app()->getLocale();

        return $translations[$locale] ?? reset($translations) ?: $name;
    }
}
