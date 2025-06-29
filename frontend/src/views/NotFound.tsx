import React from 'react';
import Header from '../components/Common/Header';


const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col font-iceland">
        <Header userVisible={false}/>

        <div className='flex flex-col items-center justify-center flex-grow bg-gradient-to-b from-violet-500 to-red-400'>
            <h1 className='text-[6rem]'>404 Not Found</h1>
            <h2 className='text-[5rem]'>Are you lost ?</h2>
        </div>




    </div>
  );
}

export default NotFound;