import React from 'react';
import { Check } from 'lucide-react';

interface PasswordChecklistProps {
  password: string;
}

export function PasswordChecklist({ password }: PasswordChecklistProps) {
  const requirements = [
    {
      label: 'At least 8 characters long',
      test: () => password.length >= 8
    },
    {
      label: 'Contains uppercase letter',
      test: () => /[A-Z]/.test(password)
    },
    {
      label: 'Contains lowercase letter',
      test: () => /[a-z]/.test(password)
    },
    {
      label: 'Contains number',
      test: () => /[0-9]/.test(password)
    },
    {
      label: 'Contains special character',
      test: () => /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }
  ];

  return (
    <div className="mt-2 space-y-2">
      {requirements.map((req, index) => (
        <div
          key={index}
          className={`flex items-center text-sm ${
            req.test() ? 'text-green-600' : 'text-gray-500'
          }`}
        >
          <Check
            className={`h-4 w-4 mr-2 transition-colors ${
              req.test() ? 'text-green-600' : 'text-gray-300'
            }`}
          />
          {req.label}
        </div>
      ))}
    </div>
  );
}