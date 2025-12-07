import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../utility/backSource';
import '../../styles/RegisterScreen.css';

const RegisterScreen = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { postData } = useApi();
    const navigate = useNavigate();
    
    const [currentStep, setCurrentStep] = useState(1);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState({
        userId: null,
        username: ''
    });
    const [oauthData, setOauthData] = useState({
        requestToken: null,
        requestTokenSecret: null,
        authUrl: null
    });

    // Step 1: Registration Form
    const submitRegistration = async (data) => {
        setError('');
        setLoading(true);
        
        try {
            // Normalize user_image: convert empty strings to null, trim whitespace
            const normalizedUserImage = (data.user_image && typeof data.user_image === 'string' && data.user_image.trim()) || null;

            const response = await postData('/api/users', {
                username: data.username,
                email: data.email,
                password: data.password,
                user_image: normalizedUserImage
            });

            // Store user data for Step 2
            setUserData({
                userId: response.userId,
                username: response.username
            });

            // Move to Step 2
            setCurrentStep(2);
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Initiate OAuth Flow (optional)
    const handleConnectDiscogs = async () => {
        setError('');
        setLoading(true);

        try {
            const response = await postData(`/api/users/${userData.userId}/discogs/oauth/request`, {});

            // Store OAuth data in state (for UI display only)
            setOauthData({
                requestToken: response.requestToken,
                requestTokenSecret: response.requestTokenSecret,
                authUrl: response.authUrl
            });

            // Redirect to Discogs authorization page
            // Backend will handle the callback and redirect back to frontend
            window.location.href = response.authUrl;
        } catch (err) {
            console.error('OAuth initiation error:', err);
            setError(err.response?.data?.message || 'Failed to connect with Discogs. Please try again.');
            setLoading(false);
        }
    };

    const goToStep = (step) => {
        if (step === 1 && currentStep === 2 && userData.userId) {
            // Allow going back to step 1
            setCurrentStep(1);
            setError('');
        } else if (step === 2 && currentStep === 1 && userData.userId) {
            // Allow going forward to step 2 if user is already registered
            setCurrentStep(2);
            setError('');
        }
    };

    return (
        <div className="form-container">
            <div className="register-form">
                {/* Step Indicator */}
                <div className="step-indicator">
                    <div 
                        className={`step ${currentStep === 1 ? 'active' : ''} ${userData.userId ? 'completed' : ''}`}
                        onClick={() => goToStep(1)}
                    >
                        <span className="step-number">1</span>
                        <span className="step-label">Register</span>
                    </div>
                    <div className="step-connector"></div>
                    <div 
                        className={`step ${currentStep === 2 ? 'active' : ''}`}
                        onClick={() => goToStep(2)}
                    >
                        <span className="step-number">2</span>
                        <span className="step-label">Connect Discogs</span>
                    </div>
                </div>

                {/* Step 1: Registration Form */}
                {currentStep === 1 && (
                    <form onSubmit={handleSubmit(submitRegistration)} className="registration-form">
                        <div className="img">
                            <img src='https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Discogs_logo_black.svg/220px-Discogs_logo_black.svg.png' alt='Discogs Logo' />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="username" className="col-form-label">Username</label>
                            <input
                                type="text"
                                id="username"
                                className="form-input"
                                {...register('username', {
                                    required: 'Username is required',
                                    minLength: {
                                        value: 3,
                                        message: 'Username must be at least 3 characters'
                                    }
                                })}
                            />
                            {errors.username && (
                                <span className="error-text">{errors.username.message}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="email" className="col-form-label">Email</label>
                            <input
                                type="email"
                                id="email"
                                className="form-input"
                                {...register('email', {
                                    required: 'Email is required',
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: 'Invalid email address'
                                    }
                                })}
                            />
                            {errors.email && (
                                <span className="error-text">{errors.email.message}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="password" className="col-form-label">Password</label>
                            <input
                                type="password"
                                id="password"
                                className="form-input"
                                {...register('password', {
                                    required: 'Password is required',
                                    minLength: {
                                        value: 8,
                                        message: 'Password must be at least 8 characters'
                                    },
                                    maxLength: {
                                        value: 20,
                                        message: 'Password must be no more than 20 characters'
                                    }
                                })}
                            />
                            <span id="passwordHelpInline" className="form-text">
                                Must be 8-20 characters long.
                            </span>
                            {errors.password && (
                                <span className="error-text">{errors.password.message}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="user_image" className="col-form-label">Profile Image URL (Optional)</label>
                            <input
                                type="url"
                                id="user_image"
                                className="form-input"
                                placeholder="https://example.com/image.jpg"
                                {...register('user_image', {
                                    pattern: {
                                        value: /^https?:\/\/.+/,
                                        message: 'Must be a valid URL starting with http:// or https://'
                                    }
                                })}
                            />
                            {errors.user_image && (
                                <span className="error-text">{errors.user_image.message}</span>
                            )}
                        </div>

                        {error && <div className="error-message">{error}</div>}
                        
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>
                )}

                {/* Step 2: Discogs OAuth Connection */}
                {currentStep === 2 && (
                    <div className="oauth-form">
                        <div className="img">
                            <img src='https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Discogs_logo_black.svg/220px-Discogs_logo_black.svg.png' alt='Discogs Logo' />
                        </div>
                        
                        <h2>Connect with Discogs (Optional)</h2>
                        <p>Welcome, <strong>{userData.username}</strong>!</p>
                        <p>You can connect your Discogs account now, or skip and connect later in your profile settings. Connecting allows you to sync your Discogs collection and wantlist.</p>
                        
                        {error && <div className="error-message">{error}</div>}
                        
                        <button 
                            type="button" 
                            className="btn btn-primary"
                            onClick={handleConnectDiscogs}
                            disabled={loading}
                        >
                            {loading ? 'Connecting...' : 'Connect with Discogs'}
                        </button>

                        <button 
                            type="button" 
                            className="btn btn-secondary"
                            onClick={() => navigate('/login')}
                        >
                            Skip for Now
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegisterScreen;

