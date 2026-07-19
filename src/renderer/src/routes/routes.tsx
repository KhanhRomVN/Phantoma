import { RouteObject } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import InspectorPage from '../features/Tool';
import { Dashboard } from '../features/Dashboard';
import Scan from '../features/Scan';
import Emulate from '../features/Emulate';
import { Wireless } from '../features/Wireless';
import Setting from '../features/Setting';
import { Recon } from '../features/Intel';
import TestPage from '../features/Test';
import Code from '../features/Code/Code';
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: '',
        element: <InspectorPage />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'recon',
        element: <Recon />,
      },
      {
        path: 'scanner',
        element: <Scan activeSubItem="scan-domain" />,
      },
      {
        path: 'tools',
        element: <InspectorPage />,
      },
      {
        path: 'test',
        element: <TestPage />,
      },
      {
        path: 'emulate',
        element: <Emulate />,
      },
      {
        path: 'code',
        element: <Code />,
      },
      {
        path: 'wireless',
        element: <Wireless />,
      },
      {
        path: 'target',
        element: <InspectorPage />,
      },
      {
        path: 'settings',
        element: <Setting />,
      },
    ],
  },
];
