import { Outlet } from 'react-router-dom';

const MainLayout = () => {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Outlet />
    </div>
  );
};

export default MainLayout;
