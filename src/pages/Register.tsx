
import React from 'react';
import { RegisterForm } from '@/components/auth/RegisterForm';

const Register = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-brand-50 to-teal-50">
      <RegisterForm />
    </div>
  );
};

export default Register;
