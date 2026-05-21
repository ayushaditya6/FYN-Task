from django.db import models
from django.core.exceptions import ValidationError

class Component(models.Model):
    """
    Represents an inventory component/part with its standard purchase
    and repair pricing options.
    """
    name = models.CharField(max_length=100)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2)
    repair_price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, default='')

    def clean(self):
        """Validates that purchase and repair prices are non-negative."""
        if self.purchase_price < 0:
            raise ValidationError({'purchase_price': 'Purchase price cannot be negative.'})
        if self.repair_price < 0:
            raise ValidationError({'repair_price': 'Repair price cannot be negative.'})

    def save(self, *args, **kwargs):
        """Enforces field cleaning prior to database save."""
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Vehicle(models.Model):
    """
    Represents a registered vehicle requiring repair services.
    """
    vin = models.CharField(max_length=17, unique=True)
    make = models.CharField(max_length=50)
    model = models.CharField(max_length=50)
    year = models.IntegerField()
    owner_name = models.CharField(max_length=100)
    owner_phone = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        """Ensures the manufacturing year is realistic."""
        if self.year < 1886 or self.year > 2100:
            raise ValidationError({'year': 'Please enter a valid model year.'})

    def save(self, *args, **kwargs):
        """Enforces clean check before database insertion."""
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.year} {self.make} {self.model} ({self.vin})"


class RepairJob(models.Model):
    """
    Represents a vehicle service session consisting of multiple reported issues,
    labor costs, additional charges, and payment tracking.
    """
    PAYMENT_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
    ]

    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='repair_jobs')
    labor_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    other_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, default='PENDING')
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    def recalculate_total(self):
        """Sums up issues' pricing along with labor and extra charges."""
        issues_cost = sum(issue.cost for issue in self.issues.all())
        self.total_price = issues_cost + self.labor_cost + self.other_charges
        # Update total directly to database without calling recursive saves
        RepairJob.objects.filter(pk=self.pk).update(total_price=self.total_price)

    def clean(self):
        """Ensures costs are positive values."""
        if self.labor_cost < 0:
            raise ValidationError({'labor_cost': 'Labor cost cannot be negative.'})
        if self.other_charges < 0:
            raise ValidationError({'other_charges': 'Other charges cannot be negative.'})

    def save(self, *args, **kwargs):
        """Forces validations and saves state changes."""
        self.full_clean()
        super().save(*args, **kwargs)
        # Recalculate total price once the primary key exists
        if self.pk:
            self.recalculate_total()

    def __str__(self):
        return f"Job #{self.pk} - {self.vehicle} ({self.payment_status})"


class Issue(models.Model):
    """
    Represents a specific repair issue registered for a RepairJob.
    Includes the resolution path (new vs repaired component).
    """
    RESOLUTION_CHOICES = [
        ('NEW', 'New Replacement Component'),
        ('REPAIR', 'Repair Component Service'),
        ('NONE', 'No Component / Service Only'),
    ]

    repair_job = models.ForeignKey(RepairJob, on_delete=models.CASCADE, related_name='issues')
    description = models.TextField()
    component = models.ForeignKey(Component, on_delete=models.SET_NULL, null=True, blank=True)
    resolution_type = models.CharField(max_length=10, choices=RESOLUTION_CHOICES, default='NONE')
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def clean(self):
        """Validates that a component is supplied if a parts-based resolution is selected."""
        if self.resolution_type in ['NEW', 'REPAIR'] and not self.component:
            raise ValidationError({'component': 'A component must be selected for this resolution type.'})

    def save(self, *args, **kwargs):
        """Automatically determines part costs and triggers parent job totals recalculation."""
        self.full_clean()
        
        # Calculate cost based on component choice and resolution type
        if self.component:
            if self.resolution_type == 'NEW':
                self.cost = self.component.purchase_price
            elif self.resolution_type == 'REPAIR':
                self.cost = self.component.repair_price
            else:
                self.cost = 0.00
        else:
            self.cost = 0.00

        super().save(*args, **kwargs)
        if self.repair_job:
            self.repair_job.recalculate_total()

    def delete(self, *args, **kwargs):
        """Forces total price updates in parent job upon deletion."""
        job = self.repair_job
        super().delete(*args, **kwargs)
        if job:
            job.recalculate_total()

    def __str__(self):
        return f"Issue #{self.pk} for Job #{self.repair_job_id}"
