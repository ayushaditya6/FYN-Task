import random
from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone

from services.models import Component, Vehicle, RepairJob, Issue


class Command(BaseCommand):
    help = "Seeds the database with components, vehicles, and a year of historic repair jobs for the analytics dashboard."

    def handle(self, *args, **options):
        self.stdout.write("Purging existing repair records, vehicles, and components...")
        Issue.objects.all().delete()
        RepairJob.objects.all().delete()
        Vehicle.objects.all().delete()
        Component.objects.all().delete()

        self.stdout.write("Seeding default components...")
        components_data = [
            {"name": "Alternator", "purchase_price": 180.00, "repair_price": 85.00, "description": "12V 130A Premium Alternator"},
            {"name": "Brake Pads Set", "purchase_price": 75.00, "repair_price": 30.00, "description": "Front/Rear Ceramic Brake Pads"},
            {"name": "AC Compressor", "purchase_price": 320.00, "repair_price": 140.00, "description": "Rotary AC Compressor assembly"},
            {"name": "Radiator", "purchase_price": 195.00, "repair_price": 80.00, "description": "Dual-row Aluminum Radiator Core"},
            {"name": "Lead Acid Battery", "purchase_price": 110.00, "repair_price": 40.00, "description": "12V 800CCA AGM Battery"},
            {"name": "Spark Plugs Pack", "purchase_price": 38.00, "repair_price": 15.00, "description": "Iridium Power Plugs (Pack of 4)"},
            {"name": "Oil Filter & Gasket", "purchase_price": 18.00, "repair_price": 5.00, "description": "Synthetic Engine Oil Filter"},
        ]
        
        components = []
        for c_data in components_data:
            c = Component.objects.create(
                name=c_data["name"],
                purchase_price=Decimal(str(c_data["purchase_price"])),
                repair_price=Decimal(str(c_data["repair_price"])),
                description=c_data["description"]
            )
            components.append(c)

        self.stdout.write("Seeding dummy vehicles...")
        vehicles_data = [
            {"vin": "1HGB1234567890123", "make": "Honda", "model": "Civic", "year": 2018, "owner_name": "Marcus Aurelius", "owner_phone": "555-123-4567"},
            {"vin": "4T1BF234567890123", "make": "Toyota", "model": "Camry", "year": 2020, "owner_name": "Julius Caesar", "owner_phone": "555-987-6543"},
            {"vin": "1FM51234567890123", "make": "Ford", "model": "F-150", "year": 2017, "owner_name": "George Washington", "owner_phone": "555-111-2222"},
            {"vin": "WAU12345678901234", "make": "Audi", "model": "A4", "year": 2021, "owner_name": "Napoleon Bonaparte", "owner_phone": "555-333-4444"},
            {"vin": "SAD12345678901234", "make": "Tesla", "model": "Model 3", "year": 2022, "owner_name": "Alexander Great", "owner_phone": "555-555-5555"},
        ]

        vehicles = []
        for v_data in vehicles_data:
            v = Vehicle.objects.create(**v_data)
            vehicles.append(v)

        self.stdout.write("Generating historical repair jobs...")
        now = timezone.now()
        payment_methods = ["Credit Card", "Cash", "Bank Transfer", "Apple Pay"]
        
        # Generate 25 jobs spread over the last 12 months for realistic revenue
        total_seeded_jobs = 25
        for i in range(total_seeded_jobs):
            # Pick a random vehicle
            vehicle = random.choice(vehicles)
            
            # Days offset from today
            days_ago = random.randint(0, 360)
            created_at = now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            
            # Pick random costs (realistic shop labor rates)
            labor = Decimal(str(random.choice([35.00, 50.00, 65.00, 80.00, 100.00])))
            other = Decimal(str(random.choice([0.00, 5.00, 10.00, 15.00, 20.00])))
            
            # 85% chance job is PAID, 15% PENDING
            is_paid = random.random() < 0.85
            payment_status = "PAID" if is_paid else "PENDING"
            payment_method = random.choice(payment_methods) if is_paid else None
            completed_at = created_at + timedelta(hours=random.randint(1, 5)) if is_paid else None

            # Create RepairJob
            job = RepairJob.objects.create(
                vehicle=vehicle,
                labor_cost=labor,
                other_charges=other,
                payment_status=payment_status,
                payment_method=payment_method,
                completed_at=completed_at,
            )
            # Override auto_now_add creation timestamp
            RepairJob.objects.filter(pk=job.pk).update(created_at=created_at)

            # Add 1 to 3 issues for each job
            num_issues = random.randint(1, 2)
            for _ in range(num_issues):
                comp = random.choice(components)
                resolution = random.choice(["NEW", "REPAIR", "NONE"])
                
                # Create issue
                Issue.objects.create(
                    repair_job=job,
                    description=f"Fixing {comp.name.lower()} because of wear & tear",
                    component=comp if resolution != "NONE" else None,
                    resolution_type=resolution
                )

            # Recalculate job total and force database update
            job.refresh_from_db()
            job.recalculate_total()

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded database with {len(components)} components, {len(vehicles)} vehicles, and {total_seeded_jobs} historical repair jobs!"))
