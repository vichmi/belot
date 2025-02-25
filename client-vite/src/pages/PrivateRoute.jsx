
import {useContext} from 'react';
import { AuthContext } from '../contexts/AuthContext';

export default function PrivateRoute({children}) {
    const {user, loading} = useContext(AuthContext);

    if(loading) return <div>Loading...</div>

    if(!user) {
        window.location.href = '/login';
        return null;
    }
    return children;
}