import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import Header from '../components/Common/Header';
import UserBox from '../components/Common/UserBox';


const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen box-border flex flex-col m-0 font-iceland">

        <Header />
        <UserBox />

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
        
        <main className='flex w-full flex-grow bg-gradient-to-r from-blue-400 to-red-400'>

            <div className='flex-1 w-1/2 flex items-center justify-center'>
                <Link to={"/game"}>
                    <div className='border-solid border-[5px] p-[50px] text-[4rem]'>PONG</div>
                </Link>
            </div>

            <div className='flex-1 w-1/2 flex items-center justify-center h-auto'>
                <Link to={"/tournament"}>
                    <div className='border-solid border-[5px] p-[50px] text-[4rem]'>TOURNAMENT</div>
                </Link>
            </div>

        </main>

    </div>
  );
}

export default Dashboard;
