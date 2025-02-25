import React, { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext';

export default function PublicRoute({children}) {
    const {user, loading} = useContext(AuthContext);

    if(loading) return <div>Loading...</div>

    if(user) {
        window.location.href = '/';
        return null;
    }
    return children;
}