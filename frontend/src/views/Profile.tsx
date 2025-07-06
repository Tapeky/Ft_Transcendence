import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Common/Header";
import { Navigate, useNavigate } from "react-router-dom";

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

    const navigate = useNavigate();


    return (
        <div className="min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none gap-8 bg-blue-800">
            <Header />
            <div className="w-[1300px] flex-grow bg-purple-500 self-center border-x-4 border-t-4 flex flex-col p-4">
                <div className="text-center text-[4rem] border-b-2 w-full">
                    <h1>Profile</h1>
                </div>
                <div className="flex m-10 flex-grow">
                    <div className="flex flex-col flex-[1.5] text-[2rem] gap-10">
                        <div className="flex justify-between">
                            <h4 className="flex-1">Username</h4>
                            <input type="text" defaultValue={user.username} className="flex-1 rounded-md" minLength={3} maxLength={10}/>
                            <div className="flex-1">
                                <button className="bg-green-400 w-[50px] rounded-md hover:scale-90 ml-3">&#x2713;</button>
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <h4 className="flex-1">Display name</h4>
                            <input type="text" defaultValue={user.display_name} className="flex-1 rounded-md" minLength={3} maxLength={10}/>
                            <div className="flex-1">
                                <button className="bg-green-400 w-[50px] rounded-md hover:scale-90 ml-3">&#x2713;</button>
                            </div>
                        </div>
                    </div>
                    <div className="flex-[0.5] flex justify-center relative">
                        <img src={`${user?.avatar_url}`} alt="icon" className="h-[300px] w-[300px] border-4"/>
                        <button className="absolute top-[280px] border-2 p-2 px-6 bg-blue-600 hover:scale-90 text-white text-[1.3rem]">EDIT</button>
                    </div>
                </div>
                <div className="flex justify-center">
                    <button onClick={() => navigate(-1)} className="border-[2px] text-[2rem] px-4">Go back</button>
                </div>


            </div>
        </div>
    );


}

export default Profile;