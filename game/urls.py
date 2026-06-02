from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('packs/', views.packs, name='packs'),
    path('leaders/', views.leaders, name='leaders'),
]
