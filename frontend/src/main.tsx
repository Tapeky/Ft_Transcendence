import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Dashboard from './views/Dashboard'
import Game from './views/Game'
import NotFound from './views/NotFound'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {path: "/", element: <App/>},
  {path: "/dashboard", element: <Dashboard />},
  {path: "/game", element: <Game/>},
  {path: "/game", element: <Game/>},
  {path: "*", element: <NotFound/>},

]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)