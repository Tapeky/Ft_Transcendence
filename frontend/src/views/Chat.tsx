import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Common/Header";
import { useState, useEffect } from "react";
import { apiService, User } from "../services/api";
import BackBtn from "../components/Common/BackBtn";
import { useNav } from "../contexts/NavContext";

type Props = {
  id: string,
};

const Chat = ({ id }: Props) => {

    const { user, loading, isAuthenticated } = useAuth();
	const [friend, setFriend] = useState<User>();
	const { goTo } = useNav();

	useEffect(() =>
	{
		if (!loading && !(isAuthenticated && user)) {
			goTo('/');
		}
	}, [loading, isAuthenticated, user, goTo]);
	
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

	if (loading) {
		return <div className='bg-purple-800 text-white text-3xl'>Loading...</div>;
	}

	if (!(isAuthenticated && user)) {
		return null;
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