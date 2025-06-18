import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Dashboard from './views/Dashboard'
import Game from './views/Game'
import NotFound from './views/NotFound'
import AuthPage from './components/Auth/AuthPage';
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'
import PongGame from './components/Pong/PongGame'

const router = createBrowserRouter([
  {path: "/", element: <AuthPage/>},
  {path: "/dashboard", element: <Dashboard/>},
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