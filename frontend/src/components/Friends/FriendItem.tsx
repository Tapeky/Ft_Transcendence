

const FriendItem = () =>
{
    const username = "Jinx";
    const displayName = "Powder";
    const online = true;
    const id = 222;

    return (
        <div className="border-white border-2 min-h-[120px] w-[450px] flex bg-blue-800">
            <div className="flex items-center justify-center min-w-[120px]">
                <img src="./src/img/jinx.gif" alt="icon" className="h-[90px] w-[90px] border-2"/>
            </div>
            <div className="leading-none flex flex-col gap-1 flex-grow overflow-hidden">
                <h2 className="mt-2">{username}</h2>
                <h2 className="text-[1.5rem]">{displayName}</h2>
            </div>
            <div className="min-w-[110px] flex flex-col pl-2">
                <div className="flex-1 flex justify-start items-center ml-1">
                    <h2 className="text-[1.5rem]">Online</h2>
                </div>
                <div className="flex-1 flex justify-evenly items-start mt-1">
                    <button className="border-2 h-[40px] w-[40px] mr-2 bg-white border-black">
                        <img src="./src/img/chat.svg" alt="chat" />
                    </button>
                    <button className="border-2 h-[40px] w-[40px] mr-2 bg-white border-black">
                        <img src="./src/img/plus.svg" alt="more" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FriendItem;
