from django.shortcuts import render, HttpResponse
from django.conf import settings
from django.http import JsonResponse, HttpResponseBadRequest
from .utils import rate_limit
from django.views.decorators.http import require_http_methods
import json
from django.core.cache import cache
import asyncio
import google.generativeai as genai
from django.views.decorators.csrf import csrf_exempt
import requests
from asgiref.sync import async_to_sync #  引入async_to_sync
import  hashlib, uuid, time
import random



# Create your views here.

session_id_age = 3600*24 #浏览器其保存cookie的秒数
cache_age = 3600#数据在服务器缓存中存储的秒数

@rate_limit(requests=60, interval=60)
#@csrf_exempt#csrf_exempt装饰器
def index(request):
    token = request.COOKIES.get('chat_token')
    if not token:
        token = generate_token()
        response = render(request, 'aichat/index.html', {'token': token}) # 把token传递给模版
        response.set_cookie('chat_token', token, max_age=session_id_age, httponly=True, samesite='Strict')
        return response
    else:
        return render(request, 'aichat/index.html', {'token': token}) # 传递token

#@csrf_exempt
async def chat_commands(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8'))
            #user_input = data['user_input']
            command = data['command']
            placeholder = data['placeholder']
            api_key_manager = APIKeyManager()
            response_text = await api_key_manager.send_message(f"'{user_input}'{command}", request.session.session_key, placeholder)
            return JsonResponse({'response': response_text})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Only POST requests are allowed.'}, status=405)

@rate_limit(requests=30, interval=60)
@require_http_methods(["POST"])
def get_api_key(request):
    try:
        api_key = APIKeyManager.get_next_key()
        return JsonResponse({'api_key': api_key})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    

class APIKeyManager:
    def __init__(self):
        self.api_keys = settings.API_KEYS
        self.current_key_index = 0
        self.max_retries = len(self.api_keys)
        self.model_name = "gemini-2.0-flash"
        self.max_tokens = 10000
        self.temperature = 0.7
        self.chats = {}## 存储每个 session_id 的对话历史

    def get_api_key_for_session(self, session_id):
        #  简单的轮询分配 API key，可以根据实际情况修改为更复杂的策略
        index = hash(session_id) % len(self.api_keys)
        print(f"start api_key index为：{index}")
        #return self.api_keys[index]
        return index

    def get_next_key(self):
        self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
        
        return self.api_keys[self.current_key_index]
    
    async def send_message(self, message, session_id): 
        api_keys = self.api_keys[:] # 创建一个副本，避免修改原始列表 
        start_index =  self.get_api_key_for_session(session_id)
        for i in range(len(api_keys)):  
            index = (start_index + i) % len(api_keys) # 按顺序轮换索引  
            api_key = api_keys[index]
            try:
                print(f"使用API Key: {api_key}  for session: {session_id}")
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel(self.model_name, generation_config={"temperature": self.temperature, 'max_output_tokens':self.max_tokens})#generation_config={"temperature": 0.7, 'max_output_tokens':self.max_tokens}
                if session_id not in self.chats:
                    self.chats[session_id] = []#c初始化对话历史

                #print(self.chats)
                chat = model.start_chat(history=self.chats[session_id])
                #print ('ok')
                response = await chat.send_message_async(message)#
                #print (response)
                self.chats[session_id].append({"role": "user", "parts": [{"text": message}]})# 添加用户消息到历史
                self.chats[session_id].append({"role": "model", "parts": [{"text": response.text}]})  # 添加AI回复到历史
                return response.text
            except Exception as e:
                print(f"API: {api_key} 错误: {str(e)}")
                await asyncio.sleep(2)
                continue
            
                
        return "⚠️ 所有 API Key 均不可用，请稍后刷新重试。"
    #self.chats[session_id].append({"role": "model", "parts": [{"text": message}]})# 添加用户消息到历史
    #self.chats[session_id].append({"role": "model", "parts": [{"text": response.text}]})  # 添加AI回复到历史

gemini_api = APIKeyManager()

def generate_token():
    #return str(uuid.uuid4())
    timestamp = str(int(time.time()))
    random_part = str(random.randint(100000, 999999))
    token_string = timestamp + random_part
    return hashlib.sha256(token_string.encode()).hexdigest()


@rate_limit(requests=10, interval=60)
async def chat(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:        
        data = json.loads(request.body)
        #print (data)
        message = data.get('message')
        #print(f"message: {message}") #  打印 message
        if not message:
            return JsonResponse({'error': 'Message is required'}, status=400)
        
        token = data.get('token')
        session_id = token
        #print(f"Session ID: {session_id}") #  打印 session_id       
        if not session_id:
            return JsonResponse({'error': '哎呦，好像出错了，请重试'}, status=400)

        # 使用缓存检查是否有相同的请求
        message_hash = hashlib.md5(message.encode()).hexdigest()
        cache_key = f'chat_cache:{session_id}:{message_hash}'
        cached_response = cache.get(cache_key)
        if cached_response:
            return JsonResponse({'response': cached_response})
        
        response = await gemini_api.send_message(message, session_id) 
        #这是核心部分，它使用 gemini_api 对象 (你的 APIKeyManager 实例) 的 send_message 方法来异步地向 Gemini API 发送消息。 
        #await 关键字用于等待 send_message 方法完成，该方法本身是一个异步函数（包含 await chat.send_message_async）。
        
        # 缓存响应
        cache.set(cache_key, response, cache_age)  # 缓存多久，指的是数据在服务器缓存中存储的时间。 超过这个时间后，服务器会自动清除缓存中的这个 cache_key 对应的 response 数据。

        return JsonResponse({'response': response})
    except json.JSONDecodeError:
        return HttpResponseBadRequest("Invalid JSON data")
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500) 
    
# 使用async_to_sync包装异步视图函数
async_chat = async_to_sync(chat) # 使用async_to_sync包装chat_api

#现在，你的index视图只负责渲染页面，而实际的API调用由单独的异步视图函数chat_api处理。 
#这解决了异步与WSGI服务器不兼容的问题，并且实现了无刷新更新聊天信息和空消息检查的功能。 
# 记住你需要使用ASGI服务器来运行你的Django项目。 安装asgiref：pip install asgiref。

