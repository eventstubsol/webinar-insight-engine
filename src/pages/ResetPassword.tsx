
import React from 'react';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

const ResetPassword = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-brand-50 to-teal-50">
      <ResetPasswordForm />
    </div>
  );
};

export default ResetPassword;
