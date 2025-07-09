const BlockedUser = () =>
{
    const username = 'SALAMANDERR';
    const id = 222;

    return (
        <div className="border-white border-2 min-h-[120px] w-[260px] flex bg-pink-800 text-[1.2rem] mt-4 overflow-hidden mx-2">
            <div className="flex items-center justify-center min-w-[120px]">
                <img src="./src/img/jinx.gif" alt="icon" className="h-[90px] w-[90px] border-2"/>
            </div>
            <div className="flex flex-col">
                <h2 className="mt-2 flex-grow">{username}</h2>
                <button className="border-2 min-h-[40px] w-[40px] bg-white border-black mb-4 self-end">
                    <img src="./src/img/unblock.svg" alt="unblock" />
                </button>
            </div>
        </div>
    );
};

export default BlockedUser;
