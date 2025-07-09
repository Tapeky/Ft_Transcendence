import CloseBtn from "../Common/CloseBtn";
import FriendItem from "./FriendItem";
import BlockList from "./BlockList";
import Requests from "./Requests";
import AddFriend from "./AddFriend";

const FriendList = () => {

    const closeWindow = () => {
        const window = document.getElementById("friendWindow");

        window?.classList.replace('flex', 'hidden');
    };

    return (
        <div id="friendWindow" className='fixed top-0 left-0 bg-white z-50 bg-opacity-20 w-screen h-screen justify-center items-center hidden text-white'>
            <div className='flex flex-col bg-gradient-to-b from-pink-800 to-purple-600 w-[500px] h-[600px] border-[5px] border-black text-[2rem]'>
                <CloseBtn func={closeWindow}/>
                <BlockList />
                <Requests />
                <AddFriend />
                <div className='flex-grow overflow-auto flex flex-col items-center gap-4'>
                    <FriendItem />
                    <FriendItem />
                    <div className="flex flex-col items-center hidden">NO FRIEND<img src="./src/img/ouin.gif" alt="OUIN" className="w-[350px]"/></div>
                </div>
            </div>
        </div>
    );
}

export default FriendList;
