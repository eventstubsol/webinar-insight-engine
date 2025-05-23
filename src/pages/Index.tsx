
import React from 'react';
import { Navigate } from 'react-router-dom';

// This Index page simply redirects to the LandingPage
const Index = () => {
  return <Navigate to="/" replace />;
};

export default Index;
