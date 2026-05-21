from django.test import TestCase
from django.urls import reverse
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from decimal import Decimal
from datetime import timedelta

from .models import Component, Vehicle, RepairJob, Issue


class ModelTests(TestCase):
    """Unit tests validating model level logic, constraints, and calculations."""

    def setUp(self):
        # Create common setup models
        self.component = Component.objects.create(
            name="Alternator",
            purchase_price=Decimal("150.00"),
            repair_price=Decimal("75.00"),
            description="12V Standard Alternator"
        )
        self.vehicle = Vehicle.objects.create(
            vin="12345678901234567",
            make="Toyota",
            model="Camry",
            year=2018,
            owner_name="John Doe",
            owner_phone="555-0199"
        )

    def test_component_creation_and_validation(self):
        """Tests component fields and validation rules."""
        self.assertEqual(str(self.component), "Alternator")
        
        # Test negative purchase price validation
        invalid_comp = Component(
            name="Negative Price Part",
            purchase_price=Decimal("-10.00"),
            repair_price=Decimal("10.00")
        )
        with self.assertRaises(ValidationError):
            invalid_comp.save()

        # Test negative repair price validation
        invalid_comp2 = Component(
            name="Negative Repair Part",
            purchase_price=Decimal("10.00"),
            repair_price=Decimal("-5.00")
        )
        with self.assertRaises(ValidationError):
            invalid_comp2.save()

    def test_vehicle_creation_and_validation(self):
        """Tests vehicle fields and year boundary validation."""
        self.assertIn("2018 Toyota Camry", str(self.vehicle))
        
        # Test unrealistic low manufacturing year
        invalid_veh = Vehicle(
            vin="VIN1", make="Ford", model="T", year=1800,
            owner_name="Henry", owner_phone="1"
        )
        with self.assertRaises(ValidationError):
            invalid_veh.save()

        # Test unrealistic future manufacturing year
        invalid_veh2 = Vehicle(
            vin="VIN2", make="Tesla", model="Model X", year=2200,
            owner_name="Elon", owner_phone="2"
        )
        with self.assertRaises(ValidationError):
            invalid_veh2.save()

    def test_repair_job_calculations_and_validation(self):
        """Tests RepairJob total price recalculations and validations."""
        job = RepairJob.objects.create(
            vehicle=self.vehicle,
            labor_cost=Decimal("50.00"),
            other_charges=Decimal("15.00")
        )
        self.assertIn("PENDING", str(job))
        self.assertEqual(job.total_price, Decimal("65.00"))

        # Test negative labor cost validation
        invalid_job = RepairJob(vehicle=self.vehicle, labor_cost=Decimal("-1.00"))
        with self.assertRaises(ValidationError):
            invalid_job.save()

        # Test negative other charges validation
        invalid_job2 = RepairJob(vehicle=self.vehicle, other_charges=Decimal("-1.00"))
        with self.assertRaises(ValidationError):
            invalid_job2.save()

    def test_issue_pricing_and_cascades(self):
        """Tests issue price calculation and cascading totals onto parent jobs."""
        job = RepairJob.objects.create(vehicle=self.vehicle, labor_cost=Decimal("50.00"))
        
        # Test resolution NONE (no part used)
        issue_none = Issue.objects.create(
            repair_job=job,
            description="Diagnostic review",
            resolution_type="NONE"
        )
        self.assertEqual(issue_none.cost, Decimal("0.00"))
        self.assertEqual(job.total_price, Decimal("50.00"))
        self.assertIn("Issue", str(issue_none))

        # Test resolution NEW component purchase
        issue_new = Issue.objects.create(
            repair_job=job,
            description="Replace Alternator",
            component=self.component,
            resolution_type="NEW"
        )
        self.assertEqual(issue_new.cost, Decimal("150.00"))
        self.assertEqual(job.total_price, Decimal("200.00"))

        # Test resolution REPAIR component service
        issue_repair = Issue.objects.create(
            repair_job=job,
            description="Rebuild Alternator",
            component=self.component,
            resolution_type="REPAIR"
        )
        self.assertEqual(issue_repair.cost, Decimal("75.00"))
        # total = labor (50) + issue_none (0) + issue_new (150) + issue_repair (75) = 275
        self.assertEqual(job.total_price, Decimal("275.00"))

        # Test validation for missing component when resolution calls for parts
        invalid_issue = Issue(repair_job=job, description="Need parts", resolution_type="NEW")
        with self.assertRaises(ValidationError):
            invalid_issue.save()

        # Test issue modification updates totals
        issue_repair.resolution_type = "NEW"
        issue_repair.save()
        self.assertEqual(issue_repair.cost, Decimal("150.00"))
        # total = 50 + 0 + 150 + 150 = 350
        self.assertEqual(job.total_price, Decimal("350.00"))

        # Test resolution NONE with component set (hits line 134 in models.py)
        issue_none_with_comp = Issue.objects.create(
            repair_job=job,
            description="Diagnostic review with part",
            component=self.component,
            resolution_type="NONE"
        )
        self.assertEqual(issue_none_with_comp.cost, Decimal("0.00"))

        # Test issue deletion updates totals
        issue_repair.delete()
        # total = 50 + 0 + 150 = 200
        self.assertEqual(job.total_price, Decimal("200.00"))


class APIViewTests(APITestCase):
    """Integration API tests for components, vehicles, jobs, and reports."""

    def setUp(self):
        self.component = Component.objects.create(
            name="Spark Plug",
            purchase_price=Decimal("15.00"),
            repair_price=Decimal("5.00"),
            description="Iridium Spark Plug"
        )
        self.vehicle = Vehicle.objects.create(
            vin="VINXYZ12345678901",
            make="Honda",
            model="Civic",
            year=2020,
            owner_name="Alice Smith",
            owner_phone="555-9000"
        )
        self.job = RepairJob.objects.create(
            vehicle=self.vehicle,
            labor_cost=Decimal("100.00"),
            other_charges=Decimal("20.00")
        )

    def test_components_api(self):
        """Verifies CRUD API endpoints for Component model."""
        # List
        response = self.client.get(reverse('component-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # Create
        data = {'name': 'Brake Pad', 'purchase_price': '40.00', 'repair_price': '20.00', 'description': 'Ceramic'}
        response = self.client.post(reverse('component-list'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Component.objects.count(), 2)

    def test_vehicles_api(self):
        """Verifies CRUD API endpoints for Vehicle model."""
        response = self.client.get(reverse('vehicle-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = {'vin': 'NEWVIN1234567', 'make': 'Ford', 'model': 'Mustang', 'year': 2021, 'owner_name': 'Bob', 'owner_phone': '555'}
        response = self.client.post(reverse('vehicle-list'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_repair_jobs_api_and_payment(self):
        """Verifies RepairJob API and the custom payment simulator endpoint."""
        # List
        response = self.client.get(reverse('repair-job-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Create issue nestedly
        issue_data = {
            'repair_job': self.job.id,
            'description': 'Replace Spark Plugs',
            'component': self.component.id,
            'resolution_type': 'NEW'
        }
        response = self.client.post(reverse('issue-list'), issue_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        self.job.refresh_from_db()
        self.assertEqual(self.job.total_price, Decimal("135.00")) # 100 labor + 20 other + 15 spark plug

        # Simulate Payment
        pay_url = reverse('repair-job-pay', kwargs={'pk': self.job.id})
        response = self.client.post(pay_url, {'payment_method': 'Cash'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['payment_status'], 'PAID')
        self.assertEqual(response.data['payment_method'], 'Cash')

        # Retry payment (should return 400 Bad Request)
        response = self.client.post(pay_url, {'payment_method': 'Credit Card'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_revenue_analytics_api(self):
        """Verifies analytics reports logic and zero-filled falls values."""
        # Make job paid and set completed date
        self.job.payment_status = 'PAID'
        self.job.completed_at = timezone.now() - timedelta(days=2)
        self.job.save()

        # Create another old job for monthly testing
        old_job = RepairJob.objects.create(
            vehicle=self.vehicle,
            labor_cost=Decimal("500.00"),
            payment_status='PAID',
            completed_at=timezone.now() - timedelta(days=45)
        )

        response = self.client.get(reverse('revenue-analytics'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify response layout structure
        self.assertIn('metrics', response.data)
        self.assertIn('daily', response.data)
        self.assertIn('monthly', response.data)
        self.assertIn('yearly', response.data)

        # Check total metric sums
        metrics = response.data['metrics']
        self.assertEqual(metrics['total_revenue'], 620.00) # 120 + 500
        self.assertEqual(metrics['completed_jobs_count'], 2)

        # Check daily contains 30 items
        self.assertEqual(len(response.data['daily']), 30)
        
        # Check monthly contains 12 items
        self.assertEqual(len(response.data['monthly']), 12)

    def test_revenue_analytics_empty(self):
        """Verifies analytics reports works when there are no paid jobs at all (hits line 120 in views.py)."""
        # Delete or reset any paid jobs
        RepairJob.objects.all().delete()
        response = self.client.get(reverse('revenue-analytics'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['metrics']['total_revenue'], 0.00)
        self.assertEqual(len(response.data['yearly']), 1)
        self.assertEqual(response.data['yearly'][0]['revenue'], 0.00)
