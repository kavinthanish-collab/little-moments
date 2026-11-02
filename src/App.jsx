
import { useState } from 'react';
import './styles/Login.css';

const API_URL = 'http://localhost:5000';

function App() {
    const [showLogin, setShowLogin] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [showDiary, setShowDiary] = useState(false);

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');

    const [thought, setThought] = useState('');
    const [dayName, setDayName] = useState('My First Day');

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSendOtp() {
        if (!username.trim() || !email.trim()) {
            setMessage('Please enter your username and email.');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setMessage('Please enter a valid email address.');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(`${API_URL}/api/send-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Unable to send OTP.');
            }

            setOtpSent(true);
            setMessage('OTP sent to your email! Please check your inbox. 💌');
        } catch (error) {
            setMessage(error.message || 'Cannot connect to the server.');
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyOtp() {
        if (!otp.trim()) {
            setMessage('Please enter the OTP.');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(`${API_URL}/api/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, otp })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'OTP verification failed.');
            }

            setUsername(data.username);
            setShowDiary(true);
        } catch (error) {
            setMessage(error.message || 'Verification failed.');
        } finally {
            setLoading(false);
        }
    }

    function saveMemory() {
        if (!thought.trim()) {
            setMessage('Please write something before saving!');
            return;
        }

        const memory = {
            username,
            email,
            dayName,
            thought,
            date: new Date().toLocaleDateString('en-GB')
        };

        localStorage.setItem('littleMomentsMemory', JSON.stringify(memory));

        setMessage('Your memories have been saved successfully! 💗');
    }

    if (showDiary) {
        return (
            <div className="diary-page">
                <div className="diary-card">
                    <div className="welcome-icon">🌷📖</div>
                    <h1>Dear Diary ♡</h1>
                    <p>Welcome to your little world, {username}!</p>

                    <div className="day-label">DAY 01</div>

                    <input
                        className="login-input"
                        value={dayName}
                        onChange={(e) => setDayName(e.target.value)}
                        placeholder="Give this day a name"
                    />

                    <p className="date-label">
                        {new Date().toLocaleDateString('en-GB')}
                    </p>

                    <textarea
                        className="diary-writing"
                        placeholder="Dear diary... Tell me about your day, your thoughts, and your little moments. ♡"
                        value={thought}
                        onChange={(e) => setThought(e.target.value)}
                    />

                    <button onClick={saveMemory}>
                        Save My Memories 💗
                    </button>

                    {message && <p className="saved-message">{message}</p>}

                    <div className="welcome-footer">
                        Every little moment matters ♡
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="welcome-page">
            <div className="welcome-card">
                {!showLogin ? (
                    <>
                        <div className="welcome-icon">📖</div>
                        <h1>Little Moments ♡</h1>
                        <p>
                            Every day is a new page.
                            <br />
                            Write your story, save your memories.
                        </p>

                        <button onClick={() => setShowLogin(true)}>
                            Start My Journey ✨
                        </button>

                        <div className="welcome-footer">Made with love ♡</div>
                    </>
                ) : !otpSent ? (
                    <>
                        <div className="welcome-icon">💌</div>
                        <h1>Welcome Back!</h1>
                        <p>Let's verify your email first.</p>

                        <input
                            type="text"
                            placeholder="Enter your username"
                            className="login-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />

                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="login-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <button onClick={handleSendOtp} disabled={loading}>
                            {loading ? 'Sending...' : 'Send OTP 💌'}
                        </button>

                        <button
                            className="back-button"
                            onClick={() => {
                                setShowLogin(false);
                                setMessage('');
                            }}
                        >
                            Go Back
                        </button>
                    </>
                ) : (
                    <>
                        <div className="welcome-icon">🔐</div>
                        <h1>Check Your Email!</h1>
                        <p>We sent a 6-digit code to:</p>
                        <p>{email}</p>

                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="Enter your 6-digit OTP"
                            className="login-input"
                            value={otp}
                            onChange={(e) =>
                                setOtp(e.target.value.replace(/\D/g, ''))
                            }
                        />

                        <button onClick={handleVerifyOtp} disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify & Open Diary ✨'}
                        </button>

                        <button
                            className="back-button"
                            onClick={() => {
                                setOtpSent(false);
                                setOtp('');
                                setMessage('');
                            }}
                        >
                            Change Email
                        </button>
                    </>
                )}

                {message && !showDiary && (
                    <p className="saved-message">{message}</p>
                )}
            </div>
        </div>
    );
}

export default App;
