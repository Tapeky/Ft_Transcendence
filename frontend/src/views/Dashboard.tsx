import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Common/Header";
import { Navigate } from "react-router-dom";
import BackBtn from "../components/Common/BackBtn";
import MatchRecap from "../components/Dashboard/MatchRecap";

const Dashboard = () => {

    const { user, loading, isAuthenticated } = useAuth();

    if (loading)
    {
        return <div className='bg-purple-800 text-white text-3xl h-screen'>Loading...</div>;
    }

    if (!(isAuthenticated && user))
    {
        return <Navigate to="/" />;
    }



    return (
        <div className="min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none gap-8 bg-blue-900 text-white  ">
            <Header />
            <div className="w-[1300px] flex-grow bg-gradient-to-b from-pink-800 to-purple-600  self-center border-x-4 border-t-4 flex flex-col p-4 overflow-auto">
                <div className="text-center text-[4rem] border-b-2 w-full flex">

                    <BackBtn />

                    <h1 className="flex-1">Dashboard</h1>
                    <div className="flex-1"></div>
                </div>

                <div className="flex flex-col mt-6 mx-10 flex-grow text-white text-[3rem]">
                    <div className="border-b-2 pb-6 border-dashed mb-10">
                        <h3 className="text-center text-[2.5rem]">Games played : {user?.total_games || 0}</h3>
                        <ul className="flex justify-evenly text-[2.2rem]">
                            <li>Wins : {user?.total_wins || 0}</li>
                            <li>Losses : {user?.total_losses || 0}</li>
                        </ul>
                    </div>
                    <h3 className="self-center">Match history</h3>
                    <div className="h-[300px] w-4/5 border-2 self-center my-4 bg-violet-700 cursor-pointer hover:scale-105 transition duration-300 hidden">
                    bosser avec les props (ou pas)</div>
                    <MatchRecap />

                </div>


            </div>
        </div>
    );


}

export default Dashboard;