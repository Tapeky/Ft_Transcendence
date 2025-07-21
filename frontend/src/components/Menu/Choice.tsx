import NavLink from "../Common/NavLink";

const Choice = () => {

    return (
            <main id="bg" className='flex w-full flex-grow bg-gradient-to-r from-blue-800 to-red-700'>
            <div className='flex-1 flex items-center justify-end'>
                <NavLink to={"/game"}>
                    <div className='text-white border-white h-[400px] w-[400px] border-solid border-[5px] p-[50px] 
                        text-[4rem] bg-[url("./img/jinx.gif")] bg-cover 
                        flex justify-center items-center hover:scale-125 transition duration-500'>
                    PONG
                    </div>
                </NavLink>
            </div>
            <div className='flex-1 flex items-center justify-center text-[5rem] text-center text-white'>CHOOSE YOUR MODE</div>
            <div className='flex-1 flex items-center justify-start'>
                <NavLink to={"/tournament"}>
                    <div className='text-white border-white h-[400px] w-[400px] border-solid border-[5px] p-[50px] 
                        text-[4rem] bg-[url("./img/tournament.gif")] bg-cover bg-center 
                        flex justify-center items-center hover:scale-125 transition duration-500'>
                    TOURNAMENT
                    </div>
                </NavLink>
            </div>
        </main>
    );
};

export default Choice;
