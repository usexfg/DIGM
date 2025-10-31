import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Type definition for tooltip props
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      year: number;
      totalEmission: number;
      cumulativeEmission: number;
      percentDistributed: number;
      distribution: {
        artists: number;
        listeners: number;
        elderfiers: number;
        ableDaiLPs: number;
        paraDaiLPs: number;
      };
    };
  }>;
}

// Explicitly typed CustomTooltip component
const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const totalEmissionQT = (data.totalEmission / 1_000_000_000_000_000_000).toFixed(3);
    const cumulativeEmissionQT = (data.cumulativeEmission / 1_000_000_000_000_000_000).toFixed(3);

    return (
      <div className="bg-black/80 p-4 rounded-lg text-white">
        <p className="font-bold">Year {data.year}</p>
        <p className="text-sm">Total Annual Emission: {totalEmissionQT}% of total supply</p>
        <p className="text-sm">Cumulative Emission: {cumulativeEmissionQT}% of total supply</p>
        <p className="text-sm">Percent Distributed: {data.percentDistributed}% of total supply</p>
        <div>
          <p className="font-semibold mt-2">Distribution Breakdown:</p>
          <p className="text-sm">Artists: {(data.distribution.artists / data.totalEmission * 100).toFixed(0)}%</p>
          <p className="text-sm">Listeners: {(data.distribution.listeners / data.totalEmission * 100).toFixed(0)}%</p>
          <p className="text-sm">Elderfiers: {(data.distribution.elderfiers / data.totalEmission * 100).toFixed(0)}%</p>
          <p className="text-sm">ABLE/DAI LPs: {(data.distribution.ableDaiLPs / data.totalEmission * 100).toFixed(0)}%</p>
          <p className="text-sm">PARA/DAI LPs: {(data.distribution.paraDaiLPs / data.totalEmission * 100).toFixed(0)}%</p>
        </div>
      </div>
    );
  }
  return null;
};

export const PARAEmissionScheduleChart: React.FC = () => {
  const TOTAL_SUPPLY = 1_000_000_000_000_000_000; // 1 QT
  // Calculate emissions for 30 years to reach ~99.99% of total supply
  const EMISSION_SCHEDULE_DATA = [];
  const TARGET_DISTRIBUTION = 0.9999; // 99.99% of total supply
  const YEARS = 30;
  const BASE_EMISSION_PER_YEAR = TARGET_DISTRIBUTION / YEARS; // ~0.03333 per year

  let cumulativeEmission = 0;

  for (let year = 0; year <= YEARS; year++) {
    // Front-load first few years, then even distribution
    let yearEmission;
    if (year === 0) {
      yearEmission = 0.10; // 10% in year 0
    } else if (year === 1) {
      yearEmission = 0.08; // 8% in year 1
    } else if (year === 2) {
      yearEmission = 0.06; // 6% in year 2
    } else if (year === 3) {
      yearEmission = 0.04; // 4% in year 3
    } else {
      // Remaining years: distribute remaining supply evenly
      const remainingSupply = TARGET_DISTRIBUTION - cumulativeEmission;
      const remainingYears = YEARS - year + 1;
      yearEmission = remainingSupply / remainingYears;
    }

    cumulativeEmission += yearEmission;

    EMISSION_SCHEDULE_DATA.push({
      year,
      totalEmission: TOTAL_SUPPLY * yearEmission,
      cumulativeEmission: TOTAL_SUPPLY * cumulativeEmission,
      percentDistributed: cumulativeEmission * 100,
      distribution: {
        artists: TOTAL_SUPPLY * yearEmission * 0.2,      // 20% of annual emission
        listeners: TOTAL_SUPPLY * yearEmission * 0.2,    // 20% of annual emission
        elderfiers: TOTAL_SUPPLY * yearEmission * 0.2,   // 20% of annual emission
        ableDaiLPs: TOTAL_SUPPLY * yearEmission * 0.2,   // 20% of annual emission
        paraDaiLPs: TOTAL_SUPPLY * yearEmission * 0.2    // 20% of annual emission
      }
    });
  }

  return (
    <div className="w-full h-[400px]">
      <h3 className="text-xl font-bold text-white mb-4">PARA Emission Schedule</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={EMISSION_SCHEDULE_DATA}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="year" 
            label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            label={{
              value: '% of Total Supply',
              angle: -90,
              position: 'insideLeft'
            }}
            tickFormatter={(value) => `${(value / 1_000_000_000_000_000_000 * 100).toFixed(1)}%`}
            domain={[0, TOTAL_SUPPLY * 1.02]} // Show up to 100%+ of total supply
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="totalEmission" 
            stroke="#8884d8" 
            name="Total Annual Emission" 
            activeDot={{ r: 8 }}
          />
          <Line 
            type="monotone" 
            dataKey="cumulativeEmission" 
            stroke="#82ca9d" 
            name="Cumulative Emission" 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
