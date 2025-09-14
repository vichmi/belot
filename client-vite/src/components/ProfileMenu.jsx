import React, { useState, useRef, useEffect } from "react";
import axios from '../libs/axios';
import { useUser } from "../contexts/UserContext";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef();
  const {user} = useUser();

  // Close menu when clicking outside
  useEffect(() => {
      function handleClickOutside(event) {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          setOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
    try {
      await axios.post('/auth/logout', {}, { withCredentials: true });
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <div className="absolute top-2 right-5" ref={menuRef}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen(!open)}
        className="focus:outline-none"
      >
        <img
          width={40}
          height={40}
          src={user?.profile || "/profile.png"} // make sure profile.png is in public/
          alt="profile"
          className="rounded-full border-2 border-gray-600 hover:border-gray-400 transition"
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 
                     rounded-lg shadow-lg overflow-hidden z-50 animate-fadeIn"
        >
          <button
            className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700"
            onClick={() => window.location.href = '/profile'}
          >
            Profile Settings
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
