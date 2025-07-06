import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Common/Header';
import Menu from '../components/Dashboard/Menu';
import Banner from '../components/Dashboard/Banner';
// import { Navigate } from 'react-router-dom';
import FriendList from '../components/Common/FriendList';



const Dashboard = () => {
  const { loading, user, isAuthenticated } = useAuth();

  if (loading)
  {
    return <div className='bg-purple-800 text-white text-3xl'>Loading...</div>;
  }

  if (!(isAuthenticated && user))
  {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none">

        <Header userVisible={true}/>

        <Banner />

        <Menu />

    </div>
  );
}

export default Dashboard;
