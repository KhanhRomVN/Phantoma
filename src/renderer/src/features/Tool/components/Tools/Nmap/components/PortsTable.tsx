import React from 'react';
import { PortResult } from '../types';
import { stateColor } from '../utils';

interface PortsTableProps {
  ports: PortResult[];
  accentColor: string;
  showRisk?: boolean;
}

const PortsTable: React.FC<PortsTableProps> = ({ ports, accentColor, showRisk = false }) => {
  const getPortRisk = (port: number, service: string): string => {
    const criticalPorts = [21, 22, 23, 25, 80, 443, 3306, 3389, 5432, 27017];
    const highPorts = [139, 445, 1433, 1521, 8080, 8443];
    
    if (criticalPorts.includes(port)) return 'critical';
    if (highPorts.includes(port)) return 'high';
    if (port > 1024 && port < 49151) return 'medium';
    return 'low';
  };

  const columns = showRisk 
    ? ['PORT', 'PROTO', 'STATE', 'SERVICE', 'VERSION', 'RISK']
    : ['PORT', 'PROTO', 'STATE', 'SERVICE', 'VERSION'];

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#fbbf24';
      default: return '#22c55e';
    }
  };

  return (
    <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 400 }}>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            {columns.map((h) => (
              <th
                key={h}
                className="text-left p-2"
                style={{ color: 'rgb(var(--text-secondary))', borderBottom: '1px solid rgb(var(--border))' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ports.map((p, i) => {
            const risk = getPortRisk(p.port, p.service);
            const riskColor = getRiskColor(risk);
            return (
              <tr key={i}>
                <td className="p-2 font-bold" style={{ color: accentColor }}>
                  {p.port}
                </td>
                <td className="p-2" style={{ color: 'rgb(var(--text-secondary))' }}>
                  {p.protocol}
                </td>
                <td className="p-2">
                  <span className="font-bold" style={{ color: stateColor(p.state) }}>
                    {p.state.toUpperCase()}
                  </span>
                </td>
                <td className="p-2" style={{ color: 'rgb(var(--text-secondary))' }}>
                  {p.service}
                </td>
                <td className="p-2" style={{ color: 'rgb(var(--text-secondary))' }}>
                  {p.version || '—'}
                </td>
                {showRisk && (
                  <td className="p-2">
                    <span className="font-semibold text-[10px]" style={{ color: riskColor }}>
                      {risk.toUpperCase()}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PortsTable;