// frontend/src/pages/Dashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export const Dashboard = () => {
  const navigate = useNavigate();

  const startSession = async () => {
    try {
      const response = await api.post('/training-sessions');
      navigate(`/training/${response.data.id}`);
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session. Check your connection or token.');
    }
  };

  return (
    <main className="dashboard-page">
      <div className="dashboard-card">
        <h1 className="dashboard-title">Chess Opening Trainer</h1>
        <p className="dashboard-subtitle">Ready to practice your lines?</p>

        <div className="dashboard-actions">
          <button className="dashboard-button" onClick={startSession}>
            Start New Training Session
          </button>
        </div>
      </div>
    </main>
  );
};
