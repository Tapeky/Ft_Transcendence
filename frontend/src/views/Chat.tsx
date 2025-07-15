import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Common/Header";
import { Navigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { apiService, User } from "../services/api";
import BackBtn from "../components/Common/BackBtn";


const Chat = () => {

    const { user, loading, isAuthenticated } = useAuth();
    const { id } = useParams();
	const [friend, setFriend] = useState<User>();
	
	useEffect(() =>
	{
		const fetchFriend = async() =>
		{
			try {
				const data = await apiService.getUserById(Number(id));
				setFriend(data);
			} catch (error) {
				console.error(error);
			}
		};
		
		fetchFriend();
		}
		, [id]
	);

    if (loading)
    {
        return <div className='bg-purple-800 text-white text-3xl h-screen'>Loading...</div>;
    }

    if (!(isAuthenticated && user))
    {
        return <Navigate to="/" />;
    }

	// user = nous, friend = la personne a qui on parle actuellement
	
    return (
        <div className="min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none gap-8 bg-blue-900 text-white  ">
            <Header />
			<div>
				<BackBtn />
			</div>

			<h1 className="text-[4rem]">Friend : {friend?.username} <br /> User : {user.username} </h1>


        </div>
    );


}

export default Chat;