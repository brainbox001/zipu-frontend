import axios from 'axios';
import API_URL from './api_url';

// axios config for server
const http = axios.create({
	baseURL: API_URL,
	timeout: 30 * 60 * 1000 ,
	headers: { 'Content-Type': 'application/json' },
	withCredentials: true,
});

export default http;
