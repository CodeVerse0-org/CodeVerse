import { useNavigate } from "react-router-dom";
import logo from "../images/logo.png";

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="px-6 py-2">
      <div className="flex items-center justify-between backdrop-blur-md bg-black/40 border border-white/10 rounded-full px-6 py-3 shadow-lg">
        <div className="flex items-center">
          <img src={logo} alt="Logo" className="w-12 h-auto" />
          <div className="text-white font-bold text-base ml-2">
            CodeVerse
          </div>
        </div>

        <button
          onClick={() => navigate("/login")}
          className="px-4 py-1.5 text-sm rounded-[8px] bg-[#043736] text-[#1893AB] font-bold border border-cyan-400/30 hover:bg-cyan-500/30 transition"
        >
          Log In
        </button>
      </div>
    </header>
  );
};

export default Header;
