import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from '../libs/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/auth/me', { withCredentials: true })
      .then(res => {
        if (res.status === 200) {
          setUser(res.data);
        }
      })
      .catch(err => {
        setUser(null);
        // console.error(err);
      })
      .finally(() => {setLoading(false)});
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}