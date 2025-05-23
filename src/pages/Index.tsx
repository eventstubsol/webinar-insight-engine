
import React from 'react';
import { Navigate } from 'react-router-dom';
import LandingPage from './LandingPage';

// This Index page redirects to the LandingPage component directly
const Index = () => {
  return <LandingPage />;
};

export default Index;
