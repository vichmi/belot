import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(undefined);
const SOCKET_SERVER_URL = 'http://localhost:3001';

export const SocketProvider = ({children}) => {
    const [socket, setSocket] = useState(null);
    useEffect(() => {
        const newSocket = io(SOCKET_SERVER_URL);
        setSocket(newSocket);
        return () => {
            newSocket.disconnect();
        }
    }, []);
    
    return (
        <SocketContext.Provider value={{socket}}>
            {children}
        </SocketContext.Provider>
    )
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if(!context) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
};