import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Wrench, Plus, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Components() {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form Fields State
  const [name, setName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [repairPrice, setRepairPrice] = useState('');
  const [description, setDescription] = useState('');

  // Alert Banner State
  const [alert, setAlert] = useState(null);

  const fetchComponents = async () => {
    try {
      const result = await api.getComponents();
      setComponents(result);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch components inventory list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (!name.trim()) {
      setAlert({ type: 'danger', message: 'Component name is required.' });
      return;
    }

    const pPrice = parseFloat(purchasePrice);
    const rPrice = parseFloat(repairPrice);

    if (isNaN(pPrice) || pPrice < 0) {
      setAlert({ type: 'danger', message: 'Purchase price must be a valid non-negative number.' });
      return;
    }

    if (isNaN(rPrice) || rPrice < 0) {
      setAlert({ type: 'danger', message: 'Repair price must be a valid non-negative number.' });
      return;
    }

    try {
      const newComp = await api.createComponent({
        name: name.trim(),
        purchase_price: pPrice.toFixed(2),
        repair_price: rPrice.toFixed(2),
        description: description.trim()
      });

      setAlert({ type: 'success', message: `Component "${newComp.name}" registered successfully!` });

      // Clear Form Fields
      setName('');
      setPurchasePrice('');
      setRepairPrice('');
      setDescription('');

      // Refresh inventory list
      fetchComponents();
    } catch (err) {
      console.error(err);
      setAlert({ type: 'danger', message: err.message || 'Error occurred while saving component.' });
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div className="section-title-bar">
        <div>
          <h2>Component Registry & Pricing</h2>
          <p className="subtitle">Register auto parts and manage retail vs custom servicing rates</p>
        </div>
      </div>

      {alert && (
        <div className={`custom-alert custom-alert-${alert.type}`}>
          {alert.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Registry Form & Inventory Info */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
          <Wrench className="secondary" size={20} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Register New Component</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="comp-name">Part Name *</label>
              <input
                id="comp-name"
                type="text"
                placeholder="e.g. Brake Caliper, Alternator"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="comp-purchase">New Purchase Price ($) *</label>
              <input
                id="comp-purchase"
                type="number"
                step="0.01"
                placeholder="e.g. 149.99"
                className="form-control"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="comp-repair">Servicing & Repair Price ($) *</label>
              <input
                id="comp-repair"
                type="number"
                step="0.01"
                placeholder="e.g. 59.99"
                className="form-control"
                value={repairPrice}
                onChange={(e) => setRepairPrice(e.target.value)}
                required
              />
            </div>

            <div className="form-group-full">
              <label htmlFor="comp-desc">Technical Description</label>
              <textarea
                id="comp-desc"
                placeholder="Specify dimensions, compatibility, material, or service warranties..."
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> Register Component
            </button>
          </div>
        </form>
      </div>

      {/* Grid of Registered Components */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem' }}>Active Parts Catalog</h3>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading catalog items...</p>
      ) : error ? (
        <p style={{ color: 'var(--danger)' }}>{error}</p>
      ) : components.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No components registered. Register a part above to get started.</p>
      ) : (
        <div className="card-grid">
          {components.map((comp) => {
            const savings = comp.purchase_price - comp.repair_price;
            const savingsPercent = comp.purchase_price > 0
              ? Math.round((savings / comp.purchase_price) * 100)
              : 0;

            return (
              <div key={comp.id} className="glass-panel interactive-card">
                <div className="card-title-row">
                  <div>
                    <h3 style={{ fontWeight: 700 }}>{comp.name}</h3>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ID: #{comp.id}</span>
                  </div>
                  {savingsPercent > 0 && (
                    <span className="badge badge-success">
                      Save {savingsPercent}% on Repair
                    </span>
                  )}
                </div>

                <p className="card-desc">
                  {comp.description || 'No technical specifications provided for this component.'}
                </p>

                <div className="card-prices">
                  <div className="price-box">
                    <span className="price-label">New Purchase</span>
                    <span className="price-value">${parseFloat(comp.purchase_price).toFixed(2)}</span>
                  </div>
                  <div className="price-box" style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: '1rem' }}>
                    <span className="price-label">Repair Service</span>
                    <span className="price-value price-value-accent">${parseFloat(comp.repair_price).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
