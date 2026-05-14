import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import DashboardLayout from './layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Menu from './pages/Menu';
import DetailPesanan from './pages/DetailPesanan';
import LaporanPenjualan from './pages/LaporanPenjualan';

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Login />,
    },
    {
      path: '/login',
      element: <Login />,
    },
    {
      path: '/admin',
      element: <DashboardLayout />,
      children: [
        {
          index: true,
          element: <Dashboard />,
        },
        {
          path: 'orders',
          element: <Orders />,
        },
        {
          path: 'menu',
          element: <Menu />,
        },
        {
          path: 'detail',
          element: <DetailPesanan />,
        },
        {
          path: 'reports',
          element: <LaporanPenjualan />,
        },
      ],
    },
    {
      path: '*',
      element: <Navigate to="/" replace />,
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
