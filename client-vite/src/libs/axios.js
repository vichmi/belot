import axios from "axios";

const instance = axios.create({
    baseURL: "http://localhost:3001",
    timeout: 1000,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    }
});

export default instance;