import React, { useEffect, useState } from 'react';
import { api } from '../api';
import {
  Car,
  Plus,
  Trash2,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Wrench,
  CreditCard,
  X
} from 'lucide-react';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [components, setComponents] = useState([]);
  const [repairJobs, setRepairJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form States - Vehicle Registration
  const [vin, setVin] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [vehicleAlert, setVehicleAlert] = useState(null);

  // Modal and Active States
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Active Job Sub-Form States (Issue Registration)
  const [issueDesc, setIssueDesc] = useState('');
  const [issueCompId, setIssueCompId] = useState('');
  const [issueResolution, setIssueResolution] = useState('NONE');
  const [jobAlert, setJobAlert] = useState(null);

  // Labor / Other charges inputs
  const [laborCost, setLaborCost] = useState('0');
  const [otherCharges, setOtherCharges] = useState('0');

  // Payment simulator state
  const [payMethod, setPayMethod] = useState('Credit Card');

  const loadData = async () => {
    try {
      const vResult = await api.getVehicles();
      const cResult = await api.getComponents();
      const jResult = await api.getRepairJobs();

      setVehicles(vResult);
      setComponents(cResult);
      setRepairJobs(jResult);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data from Django REST services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const syncChargesToBackend = async (currentLabor, currentOther) => {
    if (!activeJob) return;
    const lCost = parseFloat(currentLabor || '0');
    const oCharges = parseFloat(currentOther || '0');

    if (isNaN(lCost) || lCost < 0 || isNaN(oCharges) || oCharges < 0) {
      return;
    }

    try {
      const updatedJob = await api.updateRepairJob(activeJob.id, {
        labor_cost: lCost.toFixed(2),
        other_charges: oCharges.toFixed(2)
      });
      setActiveJob(updatedJob);
      const jResult = await api.getRepairJobs();
      setRepairJobs(jResult);
    } catch (err) {
      console.error('Failed to auto-sync charges:', err);
    }
  };

  // Debounce sync of laborCost and otherCharges to backend
  useEffect(() => {
    if (!activeJob || activeJob.payment_status !== 'PENDING') return;

    // Don't auto-save on initial mount when values match activeJob
    if (
      parseFloat(laborCost) === parseFloat(activeJob.labor_cost) &&
      parseFloat(otherCharges) === parseFloat(activeJob.other_charges)
    ) {
      return;
    }

    const timer = setTimeout(() => {
      syncChargesToBackend(laborCost, otherCharges);
    }, 600); // 600ms debounce delay

    return () => clearTimeout(timer);
  }, [laborCost, otherCharges]);

  const handleRegisterVehicle = async (e) => {
    e.preventDefault();
    setVehicleAlert(null);

    if (!vin.trim() || vin.length > 17) {
      setVehicleAlert({ type: 'danger', message: 'Please provide a valid VIN (max 17 characters).' });
      return;
    }
    if (!make.trim() || !model.trim() || !ownerName.trim()) {
      setVehicleAlert({ type: 'danger', message: 'VIN, Make, Model, and Owner Name are required.' });
      return;
    }
    const vYear = parseInt(year, 10);
    if (isNaN(vYear) || vYear < 1886 || vYear > 2100) {
      setVehicleAlert({ type: 'danger', message: 'Please enter a valid model year between 1886 and 2100.' });
      return;
    }

    try {
      const newVeh = await api.createVehicle({
        vin: vin.toUpperCase().trim(),
        make: make.trim(),
        model: model.trim(),
        year: vYear,
        owner_name: ownerName.trim(),
        owner_phone: ownerPhone.trim()
      });

      setVehicleAlert({ type: 'success', message: `Vehicle ${newVeh.make} ${newVeh.model} registered successfully!` });

      // Clear forms
      setVin('');
      setMake('');
      setModel('');
      setYear('');
      setOwnerName('');
      setOwnerPhone('');

      loadData();
    } catch (err) {
      console.error(err);
      setVehicleAlert({ type: 'danger', message: err.message || 'Error occurred while saving vehicle.' });
    }
  };

  const handleManageRepairs = (vehicle) => {
    setSelectedVehicle(vehicle);

    // Check if there is an active (PENDING) repair job for this vehicle
    const existingJob = repairJobs.find(
      job => job.vehicle === vehicle.id && job.payment_status === 'PENDING'
    );

    if (existingJob) {
      setActiveJob(existingJob);
      setLaborCost(parseFloat(existingJob.labor_cost).toString());
      setOtherCharges(parseFloat(existingJob.other_charges).toString());
    } else {
      setActiveJob(null);
    }

    setJobAlert(null);
    setModalOpen(true);
  };

  const handleInitializeTicket = async () => {
    setJobAlert(null);
    try {
      const newJob = await api.createRepairJob({
        vehicle: selectedVehicle.id,
        labor_cost: '0.00',
        other_charges: '0.00'
      });

      setActiveJob(newJob);
      setLaborCost('0');
      setOtherCharges('0');

      // Refresh job directory
      const jResult = await api.getRepairJobs();
      setRepairJobs(jResult);
    } catch (err) {
      console.error(err);
      setJobAlert({ type: 'danger', message: 'Failed to initialize a new repair job.' });
    }
  };

  const handleAddIssue = async (e) => {
    e.preventDefault();
    setJobAlert(null);

    if (!issueDesc.trim()) {
      setJobAlert({ type: 'danger', message: 'Issue description is required.' });
      return;
    }

    if (issueResolution !== 'NONE' && !issueCompId) {
      setJobAlert({ type: 'danger', message: 'Please choose a component for this resolution type.' });
      return;
    }

    try {
      await api.createIssue({
        repair_job: activeJob.id,
        description: issueDesc.trim(),
        component: issueCompId || null,
        resolution_type: issueResolution
      });

      setIssueDesc('');
      setIssueCompId('');
      setIssueResolution('NONE');

      // Reload job details to get updated pricing and issue cards
      const updatedJob = await api.getRepairJobDetails(activeJob.id);
      setActiveJob(updatedJob);

      // Refresh listings
      const jResult = await api.getRepairJobs();
      setRepairJobs(jResult);
      setJobAlert({ type: 'success', message: 'Issue registered successfully!' });
    } catch (err) {
      console.error(err);
      setJobAlert({ type: 'danger', message: err.message || 'Error occurred while saving issue.' });
    }
  };

  const handleDeleteIssue = async (issueId) => {
    setJobAlert(null);
    try {
      await api.deleteIssue(issueId);

      const updatedJob = await api.getRepairJobDetails(activeJob.id);
      setActiveJob(updatedJob);

      const jResult = await api.getRepairJobs();
      setRepairJobs(jResult);
      setJobAlert({ type: 'success', message: 'Issue removed.' });
    } catch (err) {
      console.error(err);
      setJobAlert({ type: 'danger', message: 'Failed to delete issue.' });
    }
  };

  const handleSimulatePayment = async () => {
    setJobAlert(null);
    try {
      // Force an immediate save to database to ensure latest inputs are persisted before checkout
      const lCost = parseFloat(laborCost || '0');
      const oCharges = parseFloat(otherCharges || '0');
      if (!isNaN(lCost) && lCost >= 0 && !isNaN(oCharges) && oCharges >= 0) {
        await api.updateRepairJob(activeJob.id, {
          labor_cost: lCost.toFixed(2),
          other_charges: oCharges.toFixed(2)
        });
      }

      const paidJob = await api.payRepairJob(activeJob.id, payMethod);
      setActiveJob(paidJob);

      // Refresh directory and trigger global reload
      const jResult = await api.getRepairJobs();
      setRepairJobs(jResult);
      setJobAlert({ type: 'success', message: `Contract successfully closed! Paid $${parseFloat(paidJob.total_price).toFixed(2)} via ${payMethod}.` });
    } catch (err) {
      console.error(err);
      setJobAlert({ type: 'danger', message: err.message || 'Payment simulation failed.' });
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div className="section-title-bar">
        <div>
          <h2>Vehicles & Repair Sessions</h2>
          <p className="subtitle">Register clients' vehicles, start repair contracts, select components, and checkout billing</p>
        </div>
      </div>

      {vehicleAlert && (
        <div className={`custom-alert custom-alert-${vehicleAlert.type}`}>
          {vehicleAlert.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{vehicleAlert.message}</span>
        </div>
      )}

      {/* Vehicle Registration Section */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
          <Car className="secondary" size={20} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add Client Vehicle</h3>
        </div>

        <form onSubmit={handleRegisterVehicle}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="veh-vin">Chassis VIN *</label>
              <input
                id="veh-vin"
                type="text"
                placeholder="17-Digit Vehicle Identification Number"
                className="form-control"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                maxLength={17}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="veh-make">Brand Make *</label>
              <input
                id="veh-make"
                type="text"
                placeholder="e.g. Toyota, Honda, Ford"
                className="form-control"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="veh-model">Model Series *</label>
              <input
                id="veh-model"
                type="text"
                placeholder="e.g. Camry, Civic, F-150"
                className="form-control"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="veh-year">Manufacturing Year *</label>
              <input
                id="veh-year"
                type="number"
                placeholder="e.g. 2021"
                className="form-control"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="veh-owner">Customer Name *</label>
              <input
                id="veh-owner"
                type="text"
                placeholder="First & Last Name"
                className="form-control"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="veh-phone">Customer Phone Number</label>
              <input
                id="veh-phone"
                type="text"
                placeholder="e.g. 555-0199"
                className="form-control"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> Register Vehicle
            </button>
          </div>
        </form>
      </div>

      {/* Directory Table Listing */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem' }}>Vehicles Directory</h3>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading directory records...</p>
      ) : error ? (
        <p style={{ color: 'var(--danger)' }}>{error}</p>
      ) : vehicles.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No vehicles in system. Register a client vehicle above.</p>
      ) : (
        <div className="glass-panel table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Vehicle Model</th>
                <th>VIN Identification</th>
                <th>Owner Details</th>
                <th>Service Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => {
                const pendingJob = repairJobs.find(j => j.vehicle === v.id && j.payment_status === 'PENDING');

                return (
                  <tr key={v.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{v.year} {v.make} {v.model}</div>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{v.vin}</code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{v.owner_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{v.owner_phone || 'No phone'}</div>
                    </td>
                    <td>
                      {pendingJob ? (
                        <span className="badge badge-pending">Active Job</span>
                      ) : (
                        <span className="badge badge-success">Standby</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleManageRepairs(v)}
                        className={`btn ${pendingJob ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
                      >
                        Manage Repairs <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Interactive Repair Session Modal Overlay */}
      {modalOpen && selectedVehicle && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Wrench className="secondary" size={24} />
                <div>
                  <h3 style={{ margin: 0 }}>Repairs Tracker</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.vin})
                  </span>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="panel-body">
              {jobAlert && (
                <div className={`custom-alert custom-alert-${jobAlert.type}`} style={{ margin: '0 0 1.5rem 0' }}>
                  {jobAlert.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  <span>{jobAlert.message}</span>
                </div>
              )}

              {/* No active job */}
              {!activeJob ? (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                  <Car size={48} className="primary" style={{ margin: '0 auto 1rem', strokeWidth: 1.5, opacity: 0.5 }} />
                  <h4 style={{ marginBottom: '0.5rem', fontWeight: 700 }}>No Active Service Sessions</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', maxWidth: '380px', margin: '0 auto 1.5rem' }}>
                    There are no open repair tickets for this vehicle. Create one to begin reporting issues and selecting replacement components.
                  </p>
                  <button onClick={handleInitializeTicket} className="btn btn-primary">
                    <Plus size={16} /> Initialize Repair Ticket
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TICKET ID: #{activeJob.id}</span>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Started: {new Date(activeJob.created_at).toLocaleString()}
                      </div>
                    </div>

                    <span className={`badge ${activeJob.payment_status === 'PAID' ? 'badge-success' : 'badge-pending'}`}>
                      {activeJob.payment_status === 'PAID' ? 'Fully Closed' : 'Pending Checkout'}
                    </span>
                  </div>

                  {/* Issues Listing Table/Section */}
                  <div className="issues-section">
                    <div className="issues-title-bar">
                      <h4 style={{ fontWeight: 700 }}>Reported Faults & Solutions</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {activeJob.issues.length} items logged
                      </span>
                    </div>

                    {activeJob.issues.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                        No faults logged. Report an issue below.
                      </p>
                    ) : (
                      <div>
                        {activeJob.issues.map((issue) => (
                          <div key={issue.id} className="issue-item-pill">
                            <div className="issue-info">
                              <h4>{issue.description}</h4>
                              <p>
                                {issue.resolution_type === 'NEW' && `Replacement: New ${issue.component_name}`}
                                {issue.resolution_type === 'REPAIR' && `Service: Rebuilt ${issue.component_name}`}
                                {issue.resolution_type === 'NONE' && 'Labor service only'}
                              </p>
                            </div>
                            <div className="issue-pricing-summary">
                              <span className="issue-amount">${parseFloat(issue.cost).toFixed(2)}</span>
                              {activeJob.payment_status === 'PENDING' && (
                                <button
                                  onClick={() => handleDeleteIssue(issue.id)}
                                  className="btn btn-danger"
                                  style={{ padding: '0.35rem', borderRadius: '50%', border: 'none' }}
                                  title="Delete Issue"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add New Issue Form (Visible only if active job is PENDING) */}
                  {activeJob.payment_status === 'PENDING' && (
                    <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                      <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '1rem' }}>Log New Issue</h4>
                      <form onSubmit={handleAddIssue}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div className="form-group">
                            <label>Fault / Work Required *</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g. Squealing sound under braking, AC blowing hot air"
                              value={issueDesc}
                              onChange={(e) => setIssueDesc(e.target.value)}
                              required
                            />
                          </div>

                          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 0 }}>
                            <div className="form-group">
                              <label>Component Needed</label>
                              <select
                                className="form-control"
                                value={issueCompId}
                                onChange={(e) => setIssueCompId(e.target.value)}
                              >
                                <option value="">-- No Replacement Parts --</option>
                                {components.map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} (New: ${parseFloat(c.purchase_price).toFixed(2)} | Repair: ${parseFloat(c.repair_price).toFixed(2)})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="form-group">
                              <label>Resolution Path</label>
                              <select
                                className="form-control"
                                value={issueResolution}
                                onChange={(e) => setIssueResolution(e.target.value)}
                              >
                                <option value="NONE">Labor Only (No Parts Costs)</option>
                                <option value="NEW">New Component Replacement</option>
                                <option value="REPAIR">Repair Existing Component</option>
                              </select>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                              <Plus size={14} /> Add Issue Card
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Calculations & Total pricing details */}
                  {(() => {
                    const partsSubtotal = activeJob.issues.reduce((sum, issue) => sum + parseFloat(issue.cost), 0);
                    const liveTotalDue = partsSubtotal + (parseFloat(laborCost) || 0) + (parseFloat(otherCharges) || 0);

                    return (
                      <div className="job-summary-calc-card">
                        {activeJob.payment_status === 'PENDING' ? (
                          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', margin: '0' }}>
                            <div className="form-group">
                              <label>Labor Fees ($)</label>
                              <input
                                type="number"
                                className="form-control"
                                value={laborCost}
                                onChange={(e) => setLaborCost(e.target.value)}
                                onBlur={() => syncChargesToBackend(laborCost, otherCharges)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') e.target.blur();
                                }}
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div className="form-group">
                              <label>Other Charges ($)</label>
                              <input
                                type="number"
                                className="form-control"
                                value={otherCharges}
                                onChange={(e) => setOtherCharges(e.target.value)}
                                onBlur={() => syncChargesToBackend(laborCost, otherCharges)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') e.target.blur();
                                }}
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginBottom: '0.5rem' }}>
                            <div className="calc-row">
                              <span>Labor Fees:</span>
                              <span style={{ fontWeight: 600 }}>${parseFloat(activeJob.labor_cost).toFixed(2)}</span>
                            </div>
                            <div className="calc-row">
                              <span>Other Charges:</span>
                              <span style={{ fontWeight: 600 }}>${parseFloat(activeJob.other_charges).toFixed(2)}</span>
                            </div>
                          </div>
                        )}

                        <div className="calc-row">
                          <span>Parts Subtotal:</span>
                          <span style={{ fontWeight: 600 }}>
                            ${partsSubtotal.toFixed(2)}
                          </span>
                        </div>

                        <div className="calc-row total">
                          <span>Total Due:</span>
                          <span style={{ color: 'var(--secondary)' }}>
                            ${activeJob.payment_status === 'PENDING' ? liveTotalDue.toFixed(2) : parseFloat(activeJob.total_price).toFixed(2)}
                          </span>
                        </div>

                        {activeJob.payment_status === 'PAID' && (
                          <div style={{ marginTop: '0.75rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--success)' }}>
                            Closed on {new Date(activeJob.completed_at).toLocaleString()} via {activeJob.payment_method}.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Payment Simulator Section (Visible only if active job is PENDING) */}
                  {activeJob.payment_status === 'PENDING' && (
                    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                      <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CreditCard size={18} className="secondary" /> Simulate Checkout
                      </h4>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Payment Method</label>
                          <select
                            className="form-control"
                            value={payMethod}
                            onChange={(e) => setPayMethod(e.target.value)}
                          >
                            <option value="Credit Card">Credit Card</option>
                            <option value="Cash">Cash</option>
                            <option value="Apple Pay">Apple Pay</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                          </select>
                        </div>
                        <button onClick={handleSimulatePayment} className="btn btn-primary" style={{ height: '43px' }}>
                          Simulate Payment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setModalOpen(false)} className="btn btn-secondary">
                Close Tracker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
