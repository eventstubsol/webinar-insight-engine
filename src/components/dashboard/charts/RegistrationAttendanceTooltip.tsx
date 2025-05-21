
import React from 'react';
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

export const RegistrationAttendanceTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const registrants = payload[0]?.value as number || 0;
    const attendees = payload[1]?.value as number || 0;
    const rate = registrants > 0 ? Math.round((attendees / registrants) * 100) : 0;
    
    return (
      <div className="bg-white p-3 border rounded shadow-sm">
        <p className="font-medium">{label}</p>
        <p className="text-blue-600">{`Registrants: ${registrants}`}</p>
        <p className="text-green-600">{`Attendees: ${attendees}`}</p>
        <p className="text-gray-600">{`Attendance Rate: ${rate}%`}</p>
      </div>
    );
  }
  return null;
};

export default RegistrationAttendanceTooltip;
