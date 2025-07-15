import React from 'react'
import ReactDOM from 'react-dom/client'
import Menu from './views/Menu'
import NotFound from './views/NotFound'
import AuthPage from './components/Auth/AuthPage';
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'
import PongGame from './components/Pong/PongGame'
import Profile from './views/Profile';
import Dashboard from './views/Dashboard';
import Chat from './views/Chat';

const router = createBrowserRouter([
  {path: "/", element: <AuthPage/>},
  {path: "/menu", element: <Menu/>},
  {path: "/profile", element: <Profile/>},
  {path: "/game", element: <PongGame/>},
  {path: "/dashboard/:id", element: <Dashboard/>},
  {path: "/chat/:id", element: <Chat/>},
  {path: "*", element: <NotFound/>},

]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
)