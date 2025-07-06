import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Common/Header";
import { Navigate } from "react-router-dom";
import Avatar from "../components/Profile/Avatar";
import BackBtn from "../components/Common/BackBtn";

const Profile = () => {

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

                    <h1 className="flex-1">Profile</h1>
                    <div className="flex-1"></div>
                </div>

                <div className="flex m-10 flex-grow">
                    <div className="flex flex-col flex-[1.5] text-[2rem] gap-10">
                        <div className="flex justify-between">
                            <h4 className="flex-1">Username</h4>
                            <input type="text" defaultValue={user.username} className="flex-1 rounded-md text-black indent-4" minLength={3} maxLength={10}/>
                            <div className="flex-1">
                                <button className="bg-green-500 w-[50px] rounded-md hover:scale-90 ml-3">&#x2713;</button>
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <h4 className="flex-1">Display name</h4>
                            <input type="text" defaultValue={user.display_name} className="flex-1 rounded-md text-black indent-4" minLength={3} maxLength={10}/>
                            <div className="flex-1">
                                <button className="bg-green-500 w-[50px] rounded-md hover:scale-90 ml-3">&#x2713;</button>
                            </div>
                        </div>
                    </div>


                    <Avatar />


                </div>

            </div>
        </div>
    );


}

export default Profile;