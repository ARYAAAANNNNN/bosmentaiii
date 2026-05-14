import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom'
import { OrderProvider } from './context/OrderContext'
import { CartProvider } from './context/CartContext'
import Dashboard from './pages/Dashboard'
import MenuPage from './pages/MenuPage'
import KitchenPage from './pages/KitchenPage'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import TrackingPage from './pages/TrackingPage'
import MonitoringPage from './pages/MonitoringPage'

const router = createBrowserRouter(
  [
    {
      path: '/login',
      element: <Login />,
    },
    {
      path: '/register',
      element: <Register />,
    },
    {
      path: '/tracking/:orderId',
      element: <TrackingPage />,
    },
    {
      path: '/monitoring/:orderId',
      element: <MonitoringPage />,
    },
    {
      path: '/',
      element: <Dashboard />,
    },
    {
      path: '/menu',
      element: <MenuPage />,
    },
    {
      path: '/menu/:tableId',
      element: <MenuPage />,
    },
    {
      path: '/kitchen',
      element: <KitchenPage />,
    },
    {
      path: '*',
      element: <Navigate to="/menu" replace />,
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
  return (
    <OrderProvider>
      <CartProvider>
        <RouterProvider router={router} />
      </CartProvider>
    </OrderProvider>
  )
}

export default App