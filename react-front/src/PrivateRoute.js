import React from 'react';
// Import the Navigate component from react-router-dom to handle navigation
import { Navigate } from 'react-router-dom';
// Import the custom hook to access the authentication context
import { useAuthContext } from './AuthContext';

// { children }: Is a special prop in React that represents the nested components 
// or renderable elements passed to the PrivateRoute component. 
// It allows PrivateRoute to render whatever components are wrapped inside it.

// Curly Braces ({}): In JavaScript, curly braces are used for destructuring objects. 
// Here, { children } is a way to extract the children prop from the props object passed to the PrivateRoute component. 
//   (props.children)
// 'children' is a React convention 
const PrivateRoute = ({ children }) => {
  // Destructure the isAuthenticated state from the authentication context
  const { isAuthenticated } = useAuthContext();

  // If the user is authenticated, render the children components
  // Otherwise, navigate to the login page
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Export the PrivateRoute component as the default export
export default PrivateRoute;