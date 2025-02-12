from django.core.cache import cache
from django.conf import settings
import time
from functools import wraps
import random
from django.http import JsonResponse




def rate_limit(requests=60, interval=60):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            client_ip = request.META.get('REMOTE_ADDR')
            cache_key = f'rate_limit:{client_ip}'
            
            # 获取当前请求记录
            requests_history = cache.get(cache_key, [])
            now = time.time()
            
            # 清理过期的请求记录
            requests_history = [t for t in requests_history if now - t < interval]
            
            if len(requests_history) >= requests:
                return JsonResponse({
                    'error': '请求过于频繁，请稍后再试',
                    'retry_after': int(requests_history[0] + interval - now)
                }, status=429)
            
            requests_history.append(now)
            cache.set(cache_key, requests_history, interval)
            
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator 