import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Common/Header";
import { useNav } from "../contexts/NavContext";
import Avatar from "../components/Profile/Avatar";
import BackBtn from "../components/Common/BackBtn";
import ChangeDisplayName from "../components/Profile/ChangeDisplayName";
import ChangePassword from "../components/Profile/ChangePassword";
import { useEffect } from "react";

const Profile = () => {

    const { user, loading, isAuthenticated } = useAuth();
	const { goTo } = useNav();

	useEffect(() => {
		if (!loading && !(isAuthenticated && user))
		{
			goTo('/');
		}
	}, [loading, isAuthenticated, user, goTo]);

	if (loading) {
		return <div className='bg-purple-800 text-white text-3xl'>Loading...</div>;
	}

	if (!(isAuthenticated && user)) {
		return null;
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
                        <div className="flex gap-[9.5rem]">
                            <h4 className="">Username</h4>
                            <h2>{user.username}</h2>
                        </div>
                        <ChangeDisplayName />
                        <ChangePassword />
                    </div>


                    <Avatar />


                </div>

            </div>
        </div>
    );


}

export default Profile;