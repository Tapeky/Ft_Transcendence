import { useAuth } from "../../contexts/AuthContext";

const Profile = () => {

    const { user } = useAuth();
    
    const closeWindow = () => {
        const window = document.getElementById("profileWindow");

        window?.classList.replace('flex', 'hidden');
    };

    const switchStatus = () => {
        const status = document.getElementById("status");
        const statusTitle = document.getElementById("statusTitle");
        const statusLight = document.getElementById("statusLight");

        if (user)
        {
            if (user.is_online)
            {
                if (status)
                    status.textContent = "Offline";
                if (statusTitle)
                    statusTitle.textContent = "Status : offline";
                statusLight?.classList.replace('bg-green-500', 'bg-red-500');
                user.is_online = false;
            }
            else
            {
                if (status)
                    status.textContent = "Online";
                if (statusTitle)
                    statusTitle.textContent = "Status : online";
                statusLight?.classList.replace('bg-red-500', 'bg-green-500');
                user.is_online = true;
            }
        }
    };

    return (
        <div id="profileWindow" className='fixed top-0 left-0 bg-white z-50 bg-opacity-20 w-screen h-screen justify-center items-center hidden'>
            <div className='flex flex-col bg-gradient-to-t from-red-500 to-blue-500 w-[500px] h-[600px] border-[5px] border-black text-[2rem]'>
                <div className="flex flex-col h-[50px]">
                    <button className='bg-inherit self-end mr-3 mb-5 whitespace-pre' onClick={closeWindow}>Close   X</button>
                </div>

                <h1 className="text-[3rem] self-center">{user?.username}</h1>

                <div className="flex flex-col mx-3 text-[1.7rem]">
                    <div className="border-t-2 py-4 flex flex-col">
                        <h3>Username : {user?.username}</h3>
                        <button className="rounded-md border-[2px] p-1 hover:scale-90">EDIT</button>
                    </div>
                    <div className="border-t-2 py-4 flex flex-col">
                        <h3>Display name : {user?.display_name}</h3>
                        <button className="rounded-md border-[2px] p-1 hover:scale-90">EDIT</button>
                    </div> 
                    <div className="py-4 border-t-2 flex flex-col">
                        <h3 id="statusTitle">Status : online</h3>
                        <button className="rounded-md border-[2px] p-1 hover:scale-90" onClick={switchStatus}>SWITCH</button>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Profile;