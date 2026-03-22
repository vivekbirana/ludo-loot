import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

const PlayerLayout = () => {
  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <div className="pb-20">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
};

export default PlayerLayout;
