

const MatchRecap = () => {
    const victory = true;
    const playerName = "LeMechant"
    const score = 5;
    const enemy = 2;




    return (
        <div className={`${victory ? 'bg-blue-800' : 'bg-pink-800'} h-[180px] w-4/5 border-2 
            self-center cursor-pointer hover:scale-105 transition duration-300 text-[2rem] p-4 flex`}>

            <div className="flex-1">
                <h1 className="text-[3rem]">{victory ? "Victory" : "Defeat"}</h1>
                <h2>10/07/25 - 15:46</h2>
            </div>

            <div className="flex-[2] flex items-center justify-center">
                <div className="flex flex-col items-center justify-center flex-1 overflow-hidden text-[1.7rem]">
                    <img src="" alt="icon" className="border-2 h-[100px] w-[100px]"/> 
                    <h1>Salamanderrr</h1>
                </div>
                <h1 className="flex-1 text-center text-[4rem]">5 - 2</h1>
                <div className="flex flex-col items-center justify-center flex-1 overflow-hidden text-[1.7rem]">
                    <img src="" alt="icon" className="border-2 h-[100px] w-[100px]"/> 
                    <h1>Fire</h1>
                </div>
            </div>


        </div>

    );
};

export default MatchRecap;
