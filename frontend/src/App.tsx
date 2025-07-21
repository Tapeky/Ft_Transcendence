import Menu from './views/Menu'
import NotFound from './views/NotFound'
import AuthPage from './components/Auth/AuthPage';
import PongGame from './components/Pong/PongGame'
import Profile from './views/Profile';
import Dashboard from './views/Dashboard';
import Chat from './views/Chat';
import { useState, useEffect } from 'react';
import { NavContext } from './contexts/NavContext';

function App() {
  const [path, setPath] = useState(window.location.pathname);

  const goTo = (to: string) => {
    window.history.pushState(null, '', to);
    setPath(to);
  };

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const renderPage = () => {
	switch (true) {
		case path === '/':
			return <AuthPage />;
		case path === '/menu':
			return <Menu />;
		case path === '/profile':
			return <Profile />;
		case path === '/game':
			return <PongGame />;
		case path.startsWith('/dashboard/'):
			const dashboardId = path.split('/')[2];
			return <Dashboard id={dashboardId} />;
		case path.startsWith('/chat/'):
			const chatId = path.split('/')[2];
			return <Chat id={chatId} />;
		default:
			return <NotFound />;
	}
	};

return (
  <NavContext.Provider value={{ goTo }}>
    {renderPage()}
  </NavContext.Provider>
);
}

export default App;