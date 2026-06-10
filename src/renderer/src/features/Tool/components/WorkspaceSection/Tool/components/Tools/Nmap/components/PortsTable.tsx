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

  return (
    <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            {columns.map((h) => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  padding: '8px',
                  color: '#475569',
                  borderBottom: '1px solid #1a2236',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ports.map((p, i) => {
            const risk = getPortRisk(p.port, p.service);
            const riskColor =
              risk === 'critical'
                ? '#ef4444'
                : risk === 'high'
                  ? '#f97316'
                  : risk === 'medium'
                    ? '#fbbf24'
                    : '#22c55e';
            return (
              <tr key={i}>
                <td style={{ padding: '8px', color: accentColor, fontWeight: 700 }}>
                  {p.port}
                </td>
                <td style={{ padding: '8px', color: '#64748b' }}>{p.protocol}</td>
                <td style={{ padding: '8px' }}>
                  <span style={{ color: stateColor(p.state), fontWeight: 700 }}>
                    {p.state.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '8px', color: '#94a3b8' }}>{p.service}</td>
                <td style={{ padding: '8px', color: '#64748b' }}>{p.version || '—'}</td>
                {showRisk && (
                  <td style={{ padding: '8px' }}>
                    <span style={{ color: riskColor, fontWeight: 600, fontSize: 10 }}>
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