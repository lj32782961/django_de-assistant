from django.urls import path
from . import views

app_name = 'aichat'

urlpatterns = [
    path('', views.index, name='index'),#http://127.0.0.1:8000/index/。如果path('', views.index, name='index')，http://127.0.0.1:8000/即可
    #如果主路有是path('ai/', include('aichat.urls'))
    #   子路由是path('index/', views.index, name='index')， then: http://127.0.0.1:8000/ai/index/
    #   子路由是path('', views.index, name='index')， then: http://127.0.0.1:8000/ai/
    #如果主路有是path('', include('aichat.urls'))
    #   子路由是path('index/', views.index, name='index')， then: http://127.0.0.1:8000/index/
    #   子路由是path('', views.index, name='index')， then: http://127.0.0.1:8000

    path('chat/', views.async_chat, name='chat'), #  新的URL路径
    

]


