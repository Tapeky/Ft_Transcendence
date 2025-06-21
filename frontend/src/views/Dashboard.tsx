import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Common/Header';
import Menu from '../components/Dashboard/Menu';
import Banner from '../components/Dashboard/Banner';
import { Navigate } from 'react-router-dom';



const Dashboard = () => {
  const { loading, user, isAuthenticated } = useAuth();

  if (loading) {
  return <div>Loading...</div>;
  }

  if (!(isAuthenticated && user)) {
      return <Navigate to="/" />;
  }

  //ATTENTION REFRESH = LOGIN

  return (
    <div className="min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none">

        <Header userVisible={true}/>

        <Banner />

        <Menu />

        <div className='fixed top-0 left-0 bg-white z-50 bg-opacity-20 w-screen h-screen flex justify-center items-center hidden'>
          <div className='bg-gray-500 w-[500px] h-[600px]'>
            Menu Pong
          </div>
        </div>
    </div>
  );
}

export default Dashboard;
