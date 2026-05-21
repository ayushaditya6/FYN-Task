import React from 'react';
import { LayoutDashboard, Wrench, Car } from 'lucide-react';

/**
 * Fixed left navigation panel with custom active state highlighting.
 */
export default function Navbar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'components', name: 'Component Registry', icon: Wrench },
    { id: 'vehicles', name: 'Vehicles & Repairs', icon: Car },
  ];

  return (
    <aside className="sidebar">
      <div 
        className="sidebar-logo" 
        onClick={() => setActiveTab('dashboard')} 
        style={{ cursor: 'pointer' }}
      >
        <Car size={32} className="primary" style={{ strokeWidth: 2.5 }} />
        <span>Veloce Care</span>
      </div>
      
      <nav style={{ flex: 1 }}>
        <ul className="sidebar-menu">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`sidebar-item btn-secondary ${isActive ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', justifyContent: 'flex-start' }}
                >
                  <IconComponent size={20} />
                  <span>{item.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
        Vehicle Service Management v1.0
      </div>
    </aside>
  );
}
