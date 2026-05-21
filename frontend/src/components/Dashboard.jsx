import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { DollarSign, ClipboardCheck, Clock, Layers3, RefreshCw } from 'lucide-react';

/**
 * Custom formatted tooltip component for Recharts charts.
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel" style={{ padding: '0.75rem 1rem', background: '#111827', border: '1px solid var(--border-accent)' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{label}</p>
        <p style={{ fontWeight: 800, color: 'var(--secondary)', fontSize: '1rem' }}>
          ${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [chartTab, setChartTab] = useState('monthly'); // 'daily', 'monthly', 'yearly'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getRevenueAnalytics();
      setData(result);
    } catch (err) {
      console.error(err);
      setError('Could not connect to Django REST API server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <RefreshCw className="primary animate-spin" size={40} style={{ animation: 'spin 2s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Calculating analytics metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel custom-alert custom-alert-danger" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2.5rem', textAlign: 'center' }}>
        <p>{error}</p>
        <button onClick={fetchAnalytics} className="btn btn-secondary">
          <RefreshCw size={16} /> Try Reconnecting
        </button>
      </div>
    );
  }

  const { metrics, daily, monthly, yearly } = data || {};
  const averageTicket = metrics?.completed_jobs_count > 0 
    ? metrics.total_revenue / metrics.completed_jobs_count 
    : 0;

  // Select chart dataset based on tab
  const getChartDataset = () => {
    switch (chartTab) {
      case 'daily':
        return daily.map(d => ({ name: d.date, revenue: d.revenue }));
      case 'yearly':
        return yearly.map(y => ({ name: y.year, revenue: y.revenue }));
      case 'monthly':
      default:
        return monthly.map(m => {
          // Format month e.g. "2026-05" -> "May '26"
          const [year, month] = m.month.split('-');
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const formattedLabel = `${monthNames[parseInt(month, 10) - 1]} '${year.substring(2)}`;
          return { name: formattedLabel, revenue: m.revenue };
        });
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div className="section-title-bar">
        <div>
          <h2>Executive Dashboard</h2>
          <p className="subtitle">Real-time performance analytics and service metrics</p>
        </div>
        <button onClick={fetchAnalytics} className="btn btn-secondary">
          <RefreshCw size={16} /> Refresh Metrics
        </button>
      </div>

      {/* KPI Stats widgets grid */}
      <div className="dashboard-grid">
        <div className="glass-panel kpi-card" data-tooltip={`Total Revenue: $${metrics?.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}>
          <div className="kpi-details">
            <h3>Total Revenue</h3>
            <div className="value" style={{ color: 'var(--success)' }}>
              ${metrics?.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="kpi-icon icon-teal">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="glass-panel kpi-card" data-tooltip={`Completed Jobs: ${metrics?.completed_jobs_count}`}>
          <div className="kpi-details">
            <h3>Completed Jobs</h3>
            <div className="value">
              {metrics?.completed_jobs_count}
            </div>
          </div>
          <div className="kpi-icon icon-purple">
            <ClipboardCheck size={24} />
          </div>
        </div>

        <div className="glass-panel kpi-card" data-tooltip={`Active Queue: ${metrics?.pending_jobs_count}`}>
          <div className="kpi-details">
            <h3>Active Queue</h3>
            <div className="value" style={{ color: 'var(--warning)' }}>
              {metrics?.pending_jobs_count}
            </div>
          </div>
          <div className="kpi-icon icon-orange">
            <Clock size={24} />
          </div>
        </div>

        <div className="glass-panel kpi-card" data-tooltip={`Average Ticket: $${averageTicket.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
          <div className="kpi-details">
            <h3>Average Ticket</h3>
            <div className="value" style={{ color: 'var(--primary)' }}>
              ${averageTicket.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="kpi-icon icon-blue">
            <Layers3 size={24} />
          </div>
        </div>
      </div>

      {/* Recharts Analytics Panel */}
      <div className="glass-panel chart-container-panel">
        <div className="chart-header">
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Revenue Trends</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Historical cash inflows generated from resolved repair contracts
            </p>
          </div>
          
          <div className="chart-tabs">
            <button 
              onClick={() => setChartTab('daily')} 
              className={`chart-tab-btn ${chartTab === 'daily' ? 'active' : ''}`}
            >
              Daily (30d)
            </button>
            <button 
              onClick={() => setChartTab('monthly')} 
              className={`chart-tab-btn ${chartTab === 'monthly' ? 'active' : ''}`}
            >
              Monthly (12m)
            </button>
            <button 
              onClick={() => setChartTab('yearly')} 
              className={`chart-tab-btn ${chartTab === 'yearly' ? 'active' : ''}`}
            >
              Yearly
            </button>
          </div>
        </div>

        <div style={{ width: '100%', height: 350, marginTop: '2rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartTab === 'daily' ? (
              <AreaChart data={getChartDataset()} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-secondary)" 
                  fontSize={10} 
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="var(--text-secondary)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'transparent' }} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="var(--primary)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            ) : (
              <BarChart data={getChartDataset()} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-secondary)" 
                  fontSize={11} 
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="var(--text-secondary)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                <Bar 
                  dataKey="revenue" 
                  fill="var(--secondary)" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
