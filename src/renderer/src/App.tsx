import { RouterProvider, createHashRouter } from 'react-router-dom';
import { routes } from './routes/routes';

function App() {
  const router = createHashRouter(routes);

  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
