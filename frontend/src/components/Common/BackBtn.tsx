const BackBtn = () => {
    return (
        <div className="flex-1 flex items-center">
            <button onClick={() => window.history.back()} 
            className="border-[2px] px-4 hover:scale-110 rounded-md bg-blue-800 h-[50px] w-[120px] flex items-center justify-center text-[4rem] ml-6">←</button>
        </div>
    );
};

export default BackBtn;
