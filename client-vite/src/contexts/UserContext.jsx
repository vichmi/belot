// contexts/UserContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "../libs/axios";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    axios.get("/user/profile", { withCredentials: true })
      .then(res => {setUser(res.data);})
      .catch(() => setUser(null));
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
