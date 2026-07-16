// frontend/src/Dashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';

export const Dashboard = () => {
  const navigate = useNavigate();

  const startSession = async () => {
    try {
      console.log("startSession token:", !!localStorage.getItem("token"), "len:", localStorage.getItem("token")?.length);
      const response = await api.post('/training-sessions');
      navigate(`/training/${response.data.id}`);
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session. Check your connection or token.');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Chess Opening Trainer</h1>
      <div style={{ 
        border: '1px solid #ccc', 
        padding: '2rem', 
        borderRadius: '8px', 
        backgroundColor: '#f9f9f9',
        maxWidth: '400px',
        marginTop: '20px'
      }}>
        <p>Ready to practice your lines?</p>
        <button 
          onClick={startSession} 
          style={{ 
            backgroundColor: '#007bff', 
            color: 'white', 
            padding: '10px 20px', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Start New Training Session
        </button>
      </div>
    </div>
  );
};