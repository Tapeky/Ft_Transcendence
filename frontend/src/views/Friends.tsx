import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Common/Header";
import { useNav } from "../contexts/NavContext";
import BackBtn from "../components/Common/BackBtn";
import FriendList from "../components/Friends/FriendList";
import { useEffect, useState } from "react";

const Friends = () => {
    const { user, loading, isAuthenticated } = useAuth();
    const { goTo } = useNav();
    const [friendsVisible, setFriendsVisible] = useState(true);

    useEffect(() => {
        if (!loading && !(isAuthenticated && user)) {
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
        <div className="min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none">
            <Header userVisible={true}/>
            
            <div className="flex-1 bg-gradient-to-br from-purple-800 to-blue-900 text-white">
                <div className="container mx-auto px-8 py-8">
                    <div className="flex items-center gap-4 mb-8">
                        <BackBtn />
                        <h1 className="text-4xl font-bold">Friends</h1>
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                        <FriendList 
                            setVisible={() => setFriendsVisible(false)} 
                            visible={friendsVisible}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Friends;