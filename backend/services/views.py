from django.utils import timezone
from django.db.models import Sum
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import datetime, timedelta

from .models import Component, Vehicle, RepairJob, Issue
from .serializers import (
    ComponentSerializer, 
    VehicleSerializer, 
    RepairJobSerializer, 
    IssueSerializer
)

class ComponentViewSet(viewsets.ModelViewSet):
    """API endpoints for registering and managing inventory components."""
    queryset = Component.objects.all().order_by('name')
    serializer_class = ComponentSerializer


class VehicleViewSet(viewsets.ModelViewSet):
    """API endpoints for adding and managing client vehicles."""
    queryset = Vehicle.objects.all().order_by('-created_at')
    serializer_class = VehicleSerializer


class IssueViewSet(viewsets.ModelViewSet):
    """API endpoints for managing registered vehicle issues."""
    queryset = Issue.objects.all()
    serializer_class = IssueSerializer


class RepairJobViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing repair jobs.
    Includes custom actions for simulated checkout.
    """
    queryset = RepairJob.objects.all().order_by('-created_at')
    serializer_class = RepairJobSerializer

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        """Simulates payment completion for the repair job."""
        job = self.get_object()
        if job.payment_status == 'PAID':
            return Response(
                {'error': 'This job is already paid.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payment_method = request.data.get('payment_method', 'Credit Card')
        job.payment_status = 'PAID'
        job.payment_method = payment_method
        job.completed_at = timezone.now()
        job.save()
        
        serializer = self.get_serializer(job)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RevenueAnalyticsView(APIView):
    """
    Endpoint compiling dynamic financial reports for dashboard visualizations.
    Aggregates paid jobs by day, month, and year.
    """
    def get(self, request):
        now = timezone.now()
        paid_jobs = RepairJob.objects.filter(payment_status='PAID', completed_at__isnull=False)

        # 1. Total Metrics
        total_revenue = paid_jobs.aggregate(total=Sum('total_price'))['total'] or 0.00
        pending_jobs = RepairJob.objects.filter(payment_status='PENDING')
        pending_revenue = pending_jobs.aggregate(total=Sum('total_price'))['total'] or 0.00
        completed_count = paid_jobs.count()
        pending_count = pending_jobs.count()

        # 2. Daily revenue aggregation (Last 30 Days)
        daily_data = {}
        for i in range(29, -1, -1):
            date_key = (now - timedelta(days=i)).date().strftime('%Y-%m-%d')
            daily_data[date_key] = 0.00

        for job in paid_jobs.filter(completed_at__gte=now - timedelta(days=30)):
            # convert to local timezone date string
            local_date = timezone.localtime(job.completed_at).date().strftime('%Y-%m-%d')
            if local_date in daily_data:
                daily_data[local_date] += float(job.total_price)

        formatted_daily = [{'date': k, 'revenue': round(v, 2)} for k, v in sorted(daily_data.items())]

        # 3. Monthly revenue aggregation (Last 12 Months)
        monthly_data = {}
        # build last 12 months dictionary keys
        for i in range(11, -1, -1):
            # calculate year and month offsets
            month_date = now.replace(day=1)
            for _ in range(i):
                # step back month by month
                month_date = (month_date - timedelta(days=1)).replace(day=1)
            month_key = month_date.strftime('%Y-%m')
            monthly_data[month_key] = 0.00

        for job in paid_jobs.filter(completed_at__gte=now - timedelta(days=365)):
            local_month = timezone.localtime(job.completed_at).strftime('%Y-%m')
            if local_month in monthly_data:
                monthly_data[local_month] += float(job.total_price)

        formatted_monthly = [{'month': k, 'revenue': round(v, 2)} for k, v in sorted(monthly_data.items())]

        # 4. Yearly revenue aggregation (All recorded years)
        yearly_data = {}
        for job in paid_jobs:
            local_year = timezone.localtime(job.completed_at).strftime('%Y')
            yearly_data[local_year] = yearly_data.get(local_year, 0.00) + float(job.total_price)

        formatted_yearly = [{'year': k, 'revenue': round(v, 2)} for k, v in sorted(yearly_data.items())]
        if not formatted_yearly:
            formatted_yearly = [{'year': now.strftime('%Y'), 'revenue': 0.00}]

        response_payload = {
            'metrics': {
                'total_revenue': round(float(total_revenue), 2),
                'pending_revenue': round(float(pending_revenue), 2),
                'completed_jobs_count': completed_count,
                'pending_jobs_count': pending_count,
                'total_jobs_count': completed_count + pending_count
            },
            'daily': formatted_daily,
            'monthly': formatted_monthly,
            'yearly': formatted_yearly
        }

        return Response(response_payload, status=status.HTTP_200_OK)
