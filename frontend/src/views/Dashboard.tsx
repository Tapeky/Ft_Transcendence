import React from 'react';
import AuthPage from '../components/Auth/AuthPage';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import Header from '../components/Common/Header';
import UserBox from '../components/Common/UserBox';


const Dashboard = () => {
  //const { user, logout } = useAuth();

  return (
    <div className="min-h-screen box-border flex flex-col m-0 font-mono">

        <Header />
        <UserBox />

        <div className='text-center text-[20px]'>
            Welcome USER ! (en slide)
        </div>
        <main className='flex w-full flex-grow bg-gradient-to-r from-blue-400 to-red-400'>

            <div className='flex-1 w-1/2 flex items-center justify-center'>
                <Link to={"/game"}>
                    <div className='border-solid border-[5px] p-[50px] text-[4rem]'>PONG</div>
                </Link>
            </div>

            <div className='flex-1 w-1/2 flex items-center justify-center h-auto'>
                <Link to={"/tournament"}>
                    <div className='border-solid border-[5px] p-[50px] text-[4rem]'>TOURNOI</div>
                </Link>
            </div>

        </main>

    </div>
  );
}

export default Dashboard;
