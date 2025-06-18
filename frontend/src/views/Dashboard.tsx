import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import Header from '../components/Common/Header';
import Menu from '../components/Dashboard/Menu';
import Banner from '../components/Dashboard/Banner';


const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();

//   if (!(isAuthenticated && user)) {
//       return <Navigate to="/" />;
//   }

  return (
    <div className="min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none">

        <Header userVisible={true}/>

        <Banner />

        <Menu />

    </div>
  );
}

export default Dashboard;
