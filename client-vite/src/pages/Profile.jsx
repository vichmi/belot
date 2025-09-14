import React, { useState } from "react";
import axios from "../libs/axios";
import { useUser } from "../contexts/UserContext";

export default function Profile() {
  const {user} = useUser();
  const [avatar, setAvatar] = useState(user?.profile || "/profile.png");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
  if (!(avatar instanceof File)) return;

  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64Image = reader.result; // data:image/png;base64,.... 

    await axios.put(
      "/user/profile",
      { profile: base64Image }, // 👈 send base64 in JSON
      { withCredentials: true }
    );
  };
  reader.readAsDataURL(avatar);
};


  return (
    <div className="min-h-screen w-200 bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800/80">
        <h2 className="text-2xl font-bold">Profile Settings</h2>
        <a href="/" className="text-sm text-blue-400 hover:text-blue-300">
          ← Back to Home
        </a>
      </header>

      {/* Main content - takes full screen */}
      <main className="flex-1 flex flex-col items-center justify-center space-y-10 p-6">
        {/* Avatar */}
        <div className="flex flex-col items-center space-y-4">
          <img
            src={avatar instanceof File ? URL.createObjectURL(avatar) : avatar}
            alt="avatar"
            className="w-40 h-40 sm:w-52 sm:h-52 rounded-full border-4 border-gray-600 object-cover shadow-lg"
          />
          <label className="cursor-pointer px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium">
            Change Avatar
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) setAvatar(file);
              }}
            />
          </label>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-md font-medium disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Picture"}
        </button>
      </main>
    </div>
  );
}
