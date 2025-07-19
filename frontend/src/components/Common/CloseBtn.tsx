const CloseBtn = ({ func }: { func: () => void }) => {

    const handleClick = () =>
    {
        func();
    }

    return (
            <div className="flex flex-col h-[50px] justify-center items-end">
                <button className='border-[2px] px-4 hover:scale-110 rounded-md bg-blue-800 h-[50px] w-[50px] mt-2 mr-2 flex items-center z-50 text-[2rem]' 
                    onClick={handleClick}>X</button>
            </div>
    );
};

export default CloseBtn;