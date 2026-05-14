import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './DashboardLayout.css';

const DashboardLayout = () => {
  return (
    <>
      <div className="flex h-screen bg-gray-50 print:bg-white print:h-auto">
        <div className="sidebar flex-shrink-0 w-56 h-screen sticky top-0 z-10 print:hidden">
          <Sidebar />
        </div>
        <div className="flex-1 main-content overflow-y-auto">
          <div className="p-6 bg-[#F8F9FA] min-h-screen print:p-[1in] print:bg-white print:shadow-none">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;

