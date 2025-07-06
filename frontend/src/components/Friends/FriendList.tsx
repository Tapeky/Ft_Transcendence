import CloseBtn from "../Common/CloseBtn";
import FriendItem from "./FriendItem";

const FriendList = () => {

    const closeWindow = () => {
        const window = document.getElementById("friendWindow");

        window?.classList.replace('flex', 'hidden');
    };

    return (
        <div id="friendWindow" className='fixed top-0 left-0 bg-white z-50 bg-opacity-20 w-screen h-screen justify-center items-center hidden text-white'>
            <div className='flex flex-col bg-gradient-to-b from-pink-800 to-purple-600 w-[500px] h-[600px] border-[5px] border-black text-[2rem]'>
                <CloseBtn func={closeWindow}/>
                <div className="mx-3 mb-4 border-b-2">
                    <h2 className="">Add friend</h2>
                    <input type="text" className="rounded-md mr-3 mb-5 text-black indent-4"/>
                    <button className="rounded-md border-[2px] p-1 hover:scale-90">ADD</button>
                </div>
                <div className='flex-grow overflow-auto flex flex-col items-center gap-4'>
                    <FriendItem />
                    <FriendItem />
                    <FriendItem />
                    <FriendItem />
                    <FriendItem />
                    <FriendItem />
                    <div className="flex flex-col items-center hidden">NO FRIEND<img src="./src/img/ouin.gif" alt="OUIN" className="w-[350px]"/></div>
                </div>
            </div>
        </div>
    );
}

export default FriendList;
