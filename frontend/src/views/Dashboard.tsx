import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import Header from '../components/Common/Header';
import Menu from '../components/Dashboard/Menu';


const Dashboard = () => {
  const { user, logout, isAuthenticated } = useAuth();

//   if (!(isAuthenticated && user)) {
//       return <Navigate to="/" />;
//   }

  return (
    <div className="min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland">

        <Header userVisible={true}/>
  

        <div className='text-[30px] p-2'>
            <ul className='flex justify-evenly'>
                <li>
                    Welcome <span className='text-blue-400'>{user?.display_name || user?.username}</span> !
                </li>
                <li>
                    Wins : {user?.total_wins || 0}
                </li>
                <li>
                    Losses : {user?.total_losses || 0}
                </li>
                <li>
                    Total : {user?.total_games || 0}
                </li>

            </ul>
        </div>

        <Menu />

    </div>
  );
}

export default Dashboard;
