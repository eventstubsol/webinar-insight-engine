
import React from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

const Login = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-brand-50 to-teal-50">
      <LoginForm />
    </div>
  );
};

export default Login;
