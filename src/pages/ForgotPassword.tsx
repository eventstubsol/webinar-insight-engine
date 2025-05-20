
import React from 'react';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

const ForgotPassword = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-brand-50 to-teal-50">
      <ForgotPasswordForm />
    </div>
  );
};

export default ForgotPassword;
