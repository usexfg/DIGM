import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Type definition for tooltip props
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      name: string;
      value: number;
      color: string;
      description: string;
    };
  }>;
}

// Explicitly typed CustomTooltip component
const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-black/80 p-4 rounded-lg text-white">
        <p className="font-bold">{data.name}</p>
        <p className="text-sm">{data.description}</p>
        <p className="text-sm">{data.value}% of Annual Distribution</p>
      </div>
    );
  }
  return null;
};

const ANNUAL_DISTRIBUTION_DATA = [
  {
    name: 'Artists',
    value: 20,
    color: '#4ECDC4',
    description: 'Content creation, streaming royalties'
  },
  {
    name: 'Listeners',
    value: 20,
    color: '#45B7D1',
    description: 'Platform engagement, verified listening'
  },
  {
    name: 'Elderfiers',
    value: 20,
    color: '#FF6B6B',
    description: 'Blockchain validation, cross-chain operations'
  },
  {
    name: 'ABLE/DAI LPs',
    value: 20,
    color: '#9B59B6',
    description: 'ABLE/DAI pool maintenance, stable token liquidity'
  },
  {
    name: 'PARA/DAI LPs',
    value: 20,
    color: '#F39C12',
    description: 'PARA/DAI pool maintenance, reward token liquidity'
  }
];

export const PARATotalDistributionChart: React.FC = () => {
  return (
    <div className="w-full h-[400px]">
      <h3 className="text-xl font-bold text-white mb-4">PARA Annual Distribution</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={ANNUAL_DISTRIBUTION_DATA}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {ANNUAL_DISTRIBUTION_DATA.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            layout="vertical" 
            verticalAlign="middle" 
            align="right"
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
