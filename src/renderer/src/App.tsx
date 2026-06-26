import { RouterProvider, createHashRouter } from 'react-router-dom';
import { routes } from './routes/routes';
import { DatabaseProvider } from './providers/DatabaseProvider';

function App() {
  const router = createHashRouter(routes);

  return (
    <DatabaseProvider>
      <RouterProvider router={router} />
    </DatabaseProvider>
  );
}

export default App;