from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('auth/', views.auth, name='auth'),
    path('packs/', views.packs, name='packs'),
    path('packs/open/', views.open_pack, name='open_pack'),
    path('leaders/', views.leaders, name='leaders'),
]
