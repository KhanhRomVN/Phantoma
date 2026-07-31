import { RouteObject } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import InspectorPage from '../modules/Tool';
import { Dashboard } from '../modules/Dashboard';
import Scan from '../modules/Scan';
import Emulate from '../modules/Emulate';
import { Wireless } from '../modules/Wireless';
import Setting from '../modules/Setting';
import { Recon } from '../modules/Intel';
import TestPage from '../modules/Test';
import Code from '../modules/Code/Code';
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
