from rest_framework import serializers
from .models import Component, Vehicle, RepairJob, Issue

class ComponentSerializer(serializers.ModelSerializer):
    """Serializes Component models for inventory registry APIs."""
    class Meta:
        model = Component
        fields = ['id', 'name', 'purchase_price', 'repair_price', 'description']


class IssueSerializer(serializers.ModelSerializer):
    """Serializes individual vehicle issues including nested read-only attributes."""
    component_name = serializers.ReadOnlyField(source='component.name')

    class Meta:
        model = Issue
        fields = ['id', 'repair_job', 'description', 'component', 'component_name', 'resolution_type', 'cost']


class VehicleSerializer(serializers.ModelSerializer):
    """Serializes Vehicle model for listing and registration."""
    class Meta:
        model = Vehicle
        fields = ['id', 'vin', 'make', 'model', 'year', 'owner_name', 'owner_phone', 'created_at']


class RepairJobSerializer(serializers.ModelSerializer):
    """Serializes RepairJobs nesting its issues list and parent vehicle details."""
    issues = IssueSerializer(many=True, read_only=True)
    vehicle_details = VehicleSerializer(source='vehicle', read_only=True)

    class Meta:
        model = RepairJob
        fields = [
            'id', 'vehicle', 'vehicle_details', 'issues', 'labor_cost', 
            'other_charges', 'total_price', 'payment_status', 
            'payment_method', 'created_at', 'completed_at'
        ]
