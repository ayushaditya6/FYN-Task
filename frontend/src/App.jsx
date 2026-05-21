import React, { useState } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Components from './components/Components';
import Vehicles from './components/Vehicles';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="app-container">
      {/* Visual background atmospheric elements */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      {/* Floating fixed left navigation panel */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Primary viewport content */}
      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'components' && <Components />}
        {activeTab === 'vehicles' && <Vehicles />}
      </main>
    </div>
  );
}
