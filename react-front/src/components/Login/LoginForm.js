import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../../AuthContext';
import '../../styles/LoginForm.css';

const LoginForm = () => {
    const { register, handleSubmit } = useForm();
    const { login, isAuthenticated } = useAuthContext();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [error, setError] = useState('');  // State to store the error message
    const [successMessage, setSuccessMessage] = useState('');  // State for success messages

    // Check for OAuth callback results in URL params
    useEffect(() => {
        const discogsParam = searchParams.get('discogs');
        if (discogsParam === 'connected') {
            setSuccessMessage('Discogs account connected successfully! You can now sync your collection.');
            // Clear the URL params
            setSearchParams({});
        } else if (discogsParam === 'denied') {
            setError('Discogs authorization was cancelled. You can connect later in settings.');
            setSearchParams({});
        } else if (discogsParam === 'error') {
            const message = searchParams.get('message') || 'Failed to connect Discogs account';
            setError(`Discogs connection error: ${decodeURIComponent(message)}`);
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    // Navigate to home after successful authentication
    useEffect(() => {
        if (isAuthenticated) {
            console.log('User authenticated, navigating to /home');
            navigate('/home');
        }
    }, [isAuthenticated, navigate]);

    const submitForm = async (data) => {
        setError(''); // Clear any previous errors
        const response = await login(data);

        if(response) {
            console.log('Login successful - auth state will update and trigger navigation');
        } else {
            setError('Invalid credentials. Please try again.');  // Show error message
        }
    };

    return (
        <div className="form-container">
            <form onSubmit={handleSubmit(submitForm)} className="login-form">
                <div className="img">
                    <img src='https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Discogs_logo_black.svg/220px-Discogs_logo_black.svg.png' alt='Discogs Logo' />
                </div>
                <div className="form-group">
                    <div className="col-auto">
                        <label htmlFor="email" className="col-form-label">Email</label>
                    </div>
                    <div className="col-auto">
                        <input
                            type="email"
                            className="form-input"
                            {...register('email')}
                            required
                        />
                    </div>
                </div>
                <div className="form-group">
                    <div className="col-auto">
                        <label htmlFor="password" className="col-form-label">Password</label>
                    </div>
                    <div className="col-auto">
                        <input
                            type="password"
                            className="form-input"
                            {...register('password')}
                            required
                        />
                    </div>
                    <div className="col-auto">
                        <span id="passwordHelpInline" className="form-text">
                            Must be 8-20 characters long.
                        </span>
                    </div>
                    <span>Just Browsing? Search discogs <Link to='/search'>here</Link> </span>
                </div>
                {/* Display error message if it exists */}
                {error && <div className="error-message">{error}</div>}
                {/* Display success message if it exists */}
                {successMessage && <div className="success-message" style={{ color: 'green', marginBottom: '10px' }}>{successMessage}</div>}
                <button type="submit" className="btn btn-primary col-2">
                    Login
                </button>
                <div style={{ marginTop: '15px', textAlign: 'center' }}>
                    <span>Don't have an account? <Link to='/register'>Register here</Link></span>
                </div>
            </form>
        </div>
    );
};

export default LoginForm;