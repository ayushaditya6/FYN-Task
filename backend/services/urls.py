from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ComponentViewSet, 
    VehicleViewSet, 
    RepairJobViewSet, 
    IssueViewSet, 
    RevenueAnalyticsView
)

router = DefaultRouter()
router.register(r'components', ComponentViewSet, basename='component')
router.register(r'vehicles', VehicleViewSet, basename='vehicle')
router.register(r'repair-jobs', RepairJobViewSet, basename='repair-job')
router.register(r'issues', IssueViewSet, basename='issue')

urlpatterns = [
    path('', include(router.urls)),
    path('revenue-analytics/', RevenueAnalyticsView.as_view(), name='revenue-analytics'),
]
