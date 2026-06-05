from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('auth/', views.auth, name='auth'),
    path('packs/', views.packs, name='packs'),
    path('packs/open/', views.open_pack, name='open_pack'),
    path('leaders/', views.leaders, name='leaders'),
    path('admin-events/', views.admin_events, name='admin_events'),
    path('slot/set/', views.set_slot, name='set_slot'),
    path('slot/clear/', views.clear_slot, name='clear_slot'),
    path('event/start/',           views.start_event,      name='start_event'),
    path('event/update-snapshot/', views.update_snapshot,   name='update_snapshot'),
    path('event/cancel-start/',    views.cancel_start,      name='cancel_start'),
    path('event/finish/',       views.finish_event, name='finish_event'),
    path('event/cancel/',       views.cancel_event, name='cancel_event'),
    path('packs/promo/', views.redeem_promo, name='redeem_promo'),
]
