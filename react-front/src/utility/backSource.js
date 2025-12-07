import { useState, useCallback } from "react";
import axios from "axios";

// Use environment variable or fallback to relative URL (same origin)
// For Create React App, use REACT_APP_ prefix
// Empty string means use relative URLs (same origin)
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

console.log('[backSource] API Base URL:', API_BASE_URL);

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000, // 10 second timeout
    timeoutErrorMessage: 'Request timed out after 10 seconds'
});

// Add request interceptor to include auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token') || document.cookie
            .split('; ')
            .find(row => row.startsWith('token='))
            ?.split('=')[1];
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const useApi = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getData = useCallback(async (endpoint) => {
        setLoading(true);
        setError(null);
        try {
            console.log(`[backSource] GET request to: ${endpoint}`);
            const response = await api.get(endpoint);
            console.log(`[backSource] Response received from ${endpoint}:`, {
                status: response.status,
                dataKeys: response.data ? Object.keys(response.data) : 'no data'
            });
            return response.data;
        } catch (err) {
            console.error(`[backSource] Error fetching data from ${endpoint}:`, {
                message: err.message,
                status: err.response?.status,
                statusText: err.response?.statusText,
                data: err.response?.data
            });
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateData = useCallback(async (endpoint, data) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.put(endpoint, data);
            return response.data;
        } catch (err) {
            setError(err);
            console.error("Error updating data:", err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const putData = useCallback(async (endpoint, data) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.put(endpoint, data);
            return response.data;
        } catch (err) {
            setError(err);
            console.error("Error putting data:", err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const postData = useCallback(async (endpoint, data) => {
        setLoading(true);
        setError(null);
        try {
            // Log auth token status before request
            const token = localStorage.getItem('token') || document.cookie
                .split('; ')
                .find(row => row.startsWith('token='))
                ?.split('=')[1];
            console.log(`[backSource][postData] Sending POST to: ${endpoint}`);
            console.log(`[backSource][postData] Has token: ${!!token}, Token preview: ${token ? token.substring(0, 20) + '...' : 'none'}`);
            console.log(`[backSource][postData] Request data:`, data);
            
            const response = await api.post(endpoint, data);
            console.log(`[backSource][postData] Response received from ${endpoint}:`, {
                status: response.status,
                dataKeys: response.data ? Object.keys(response.data) : 'no data'
            });
            return response.data;
        } catch (err) {
            setError(err);
            console.error(`[backSource][postData] Error posting data to ${endpoint}:`, {
                message: err.message,
                status: err.response?.status,
                statusText: err.response?.statusText,
                data: err.response?.data
            });
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteData = useCallback(async (endpoint) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.delete(endpoint);
            return response.data;
        } catch (err) {
            setError(err);
            console.error("Error deleting data:", err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        getData,
        updateData,
        putData,
        postData,
        deleteData,
        loading,
        error,
    };
};