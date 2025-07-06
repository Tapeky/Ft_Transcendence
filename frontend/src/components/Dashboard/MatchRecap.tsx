

const MatchRecap = () => {
    const victory = true;
    const playerName = "LeMechant"




    return (
        <div className={`${victory ? 'bg-blue-900' : 'bg-pink-800'} h-[300px] w-4/5 border-2 self-center my-4 cursor-pointer hover:scale-105 transition duration-300 indent-2`}>
            <h1 className="text-[4rem]">{victory ? "Victory" : "Defeat"}</h1>
            <h2 className="">vs {playerName}</h2>



        </div>

    );
};

export default MatchRecap;
