const FriendList = () => {

    const closeWindow = () => {
        const window = document.getElementById("friendWindow");

        window?.classList.replace('flex', 'hidden');
    }

    return (
        <div id="friendWindow" className='fixed top-0 left-0 bg-white z-50 bg-opacity-20 w-screen h-screen justify-center items-center hidden'>
            <div className='flex flex-col bg-violet-400 w-[500px] h-[600px] border-double border-[10px] border-black text-[2rem]'>
                <div className="flex flex-col h-[50px]">
                    <button className='bg-inherit self-end mr-3 mb-5' onClick={closeWindow}>X</button>
                </div>
                <div className="mx-3 border-b-2">
                    <h2 className="">Add friend</h2>
                    <input type="text" className="rounded-md mr-3 mb-5"/>
                    <button className="rounded-md border-[2px] p-1 hover:scale-90">ADD</button>
                </div>
                <ul className='flex-grow overflow-auto scroll ml-3'>
                    <li className="hidden">FRIEND</li>
                    <li className="flex flex-col items-center">NO FRIEND<img src="./src/img/ouin.gif" alt="OUIN" className="w-[350px]"/></li>
                </ul>
                </div>
        </div>
    );
}

export default FriendList;
