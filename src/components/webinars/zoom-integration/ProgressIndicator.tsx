
import React from 'react';
import { Check } from 'lucide-react';
import { WizardStep } from './types';

interface ProgressIndicatorProps {
  currentStep: WizardStep;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep
}) => {
  const steps = [
    "Introduction",
    "Create App",
    "Configure",
    "Credentials",
    "Success"
  ];

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        {steps.map((step, index) => (
          <div 
            key={index} 
            className={`flex flex-col items-center ${index > currentStep ? 'text-muted-foreground' : ''}`}
          >
            <div 
              className={`rounded-full w-8 h-8 flex items-center justify-center border ${
                index < currentStep 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : index === currentStep 
                    ? 'bg-primary/20 border-primary text-primary' 
                    : 'bg-muted border-muted-foreground text-muted-foreground'
              }`}
            >
              {index < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <span className="text-xs mt-1 hidden sm:block">{step}</span>
          </div>
        ))}
      </div>
      <div className="relative h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 ease-in-out"
          style={{ width: `${(currentStep / 4) * 100}%` }}
        />
      </div>
    </div>
  );
};
