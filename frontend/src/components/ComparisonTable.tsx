import React from 'react';

// Simple comparison data – keep it concise and matter-of-fact
const rows = [
  { feature: 'Monthly Fee', spotify: '$10.99', apple: '$10.99', soundcloud: '$9.99', digm: 'Free' },
  { feature: 'Lossless Audio', spotify: '❌', apple: '✅', soundcloud: '❌', digm: '✅' },
  { feature: 'Own the Music', spotify: '❌', apple: '❌', soundcloud: '❌', digm: '✅' },
  { feature: 'Artist Token Rewards', spotify: '❌', apple: '❌', soundcloud: '❌', digm: '✅ PARA' },
  { feature: 'P2P Payments', spotify: '❌', apple: '❌', soundcloud: '❌', digm: '✅ Fuego' },
  { feature: 'Open Source', spotify: '❌', apple: '❌', soundcloud: '❌', digm: '✅' },
];

const ComparisonTable: React.FC = () => (
  <div className="glass p-8 mt-8">
    <h2 className="text-2xl font-bold text-white mb-4 text-center">How DIGM Stacks Up</h2>
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left text-gray-300">
        <thead>
          <tr>
            <th className="px-4 py-2 font-semibold text-white">Feature</th>
            <th className="px-4 py-2 font-semibold">Spotify</th>
            <th className="px-4 py-2 font-semibold">Apple Music</th>
            <th className="px-4 py-2 font-semibold">SoundCloud</th>
            <th className="px-4 py-2 font-semibold text-fuchsia-400">DIGM</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature} className="border-t border-gray-700/40">
              <td className="px-4 py-2 whitespace-nowrap text-white font-medium">{row.feature}</td>
              <td className="px-4 py-2 whitespace-nowrap text-center">{row.spotify}</td>
              <td className="px-4 py-2 whitespace-nowrap text-center">{row.apple}</td>
              <td className="px-4 py-2 whitespace-nowrap text-center">{row.soundcloud}</td>
              <td className="px-4 py-2 whitespace-nowrap text-center font-semibold text-fuchsia-400">{row.digm}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default ComparisonTable; 