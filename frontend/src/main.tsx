import React from 'react'
import ReactDOM from 'react-dom/client'
import Dashboard from './views/Dashboard'
import NotFound from './views/NotFound'
import AuthPage from './components/Auth/AuthPage';
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'
import PongGame from './components/Pong/PongGame'
import Profile from './views/Profile';

const router = createBrowserRouter([
  {path: "/", element: <AuthPage/>},
  {path: "/dashboard", element: <Dashboard/>},
  {path: "/profile", element: <Profile/>},
  {path: "/game", element: <PongGame/>},
  {path: "*", element: <NotFound/>},

]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
)