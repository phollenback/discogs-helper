import React, { createContext, useState, useContext as useReactContext, useEffect } from 'react';
import { useCookies } from 'react-cookie';
import { useApi } from './utility/backSource';

// Create a Context
const AuthContext = createContext();

// Create a provider component
export const AuthProvider = ({ children }) => {
  const { postData } = useApi();
  const [cookies, setCookies, removeCookie] = useCookies();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // State to hold the authentication data (user info)
  const [authState, setAuthState] = useState({
    userId: '',
    username: '',
    email: '',
    token: '',
    isAdmin: false
  });

  const login = async (data) => {
    try {
      // Make the request to the backend to authenticate the user
      const userData = await postData('/api/users/auth', data);
  
      setCookies('token', userData.token, { path: '/' }); // set the token in cookies
      localStorage.setItem('token', userData.token); // also store in localStorage
      
      // Store user data separately for easier access
      const userInfo = {
        userId: userData.user.userId,    
        username: userData.user.username, 
        email: userData.user.email,       
        token: userData.token,
        isAdmin: userData.user.isAdmin || false
      };
      
      console.log('[AuthContext] Login - isAdmin value:', userInfo.isAdmin, 'type:', typeof userInfo.isAdmin);
      
      console.log('[AuthContext] Storing userInfo with isAdmin:', userInfo.isAdmin);
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
  
      setIsAuthenticated(true);
  
      // Update the auth state with user data
      setAuthState(userInfo);
  
      return true;
    } catch (error) {
      // Handle the error (e.g., incorrect credentials)
      console.error('Login failed:', error);
      setIsAuthenticated(false);
      return false;
    }
  };

  // Function to log out the user
  const logout = () => {
    setAuthState({
      userId: '',
      username: '',
      email: '',
      token: '',
      isAdmin: false
    });

    removeCookie('token');
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');

    setIsAuthenticated(false);
  };

  // Check for existing token on mount and restore session
  useEffect(() => {
    const restoreSession = () => {
      console.log('[AuthContext] Checking for existing session...');
      
      // Try to get stored user info first (faster than decoding)
      const storedUserInfo = localStorage.getItem('userInfo');
      const token = localStorage.getItem('token') || cookies.token;
      
      if (storedUserInfo && token) {
        try {
          const userInfo = JSON.parse(storedUserInfo);
          console.log('[AuthContext] Restoring session from localStorage:', userInfo);
          
          // Decode token to check expiration
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          
          const payload = JSON.parse(jsonPayload);
          
          // Check if token is expired
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            console.log('[AuthContext] Token expired, logging out');
            logout();
            return;
          }
          
          // Restore auth state with token - prioritize isAdmin from userInfo
          setAuthState({
            ...userInfo,
            token: token,
            isAdmin: userInfo.isAdmin || payload.isAdmin || false
          });
          
          console.log('[AuthContext] Restored isAdmin:', userInfo.isAdmin || payload.isAdmin || false);
          
          setIsAuthenticated(true);
          console.log('[AuthContext] Session restored successfully for:', userInfo.username);
        } catch (error) {
          console.error('[AuthContext] Error restoring session:', error);
          // If restoration fails, clear everything
          logout();
        }
      } else if (token) {
        // Fallback: decode token if userInfo not stored
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          
          const payload = JSON.parse(jsonPayload);
          
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            console.log('[AuthContext] Token expired, logging out');
            logout();
            return;
          }
          
          const userInfo = {
            userId: payload.userId,
            username: payload.username,
            email: payload.email,
            token: token,
            isAdmin: payload.isAdmin || false
          };
          
          localStorage.setItem('userInfo', JSON.stringify(userInfo));
          setAuthState(userInfo);
          setIsAuthenticated(true);
          console.log('[AuthContext] Session restored from token for:', payload.username);
        } catch (error) {
          console.error('[AuthContext] Error decoding token:', error);
          logout();
        }
      } else {
        console.log('[AuthContext] No existing session found');
      }
    };
    
    restoreSession();
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    console.log('Auth State update:', authState);
  }, [authState]); 

  return (
    <AuthContext.Provider value={{ isAuthenticated, authState, login, logout, cookies }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to access the AuthContext
export const useAuthContext = () => useReactContext(AuthContext);