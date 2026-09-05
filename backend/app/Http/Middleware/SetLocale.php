<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    private const SUPPORTED_LOCALES = ['en', 'ar', 'ku'];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->localeFromHeaders($request);

        app()->setLocale($locale);

        return $next($request);
    }

    private function localeFromHeaders(Request $request): string
    {
        if ($request->headers->has('X-Locale')) {
            $locale = strtolower(trim((string) $request->header('X-Locale')));

            return in_array($locale, self::SUPPORTED_LOCALES, true) ? $locale : 'en';
        }

        $acceptLanguage = $request->header('Accept-Language');

        if (! is_string($acceptLanguage) || trim($acceptLanguage) === '') {
            return 'en';
        }

        foreach (explode(',', $acceptLanguage) as $language) {
            $language = trim(explode(';', $language, 2)[0]);
            $primaryLanguage = strtolower(explode('-', $language, 2)[0]);

            if (in_array($primaryLanguage, self::SUPPORTED_LOCALES, true)) {
                return $primaryLanguage;
            }
        }

        return 'en';
    }
}
