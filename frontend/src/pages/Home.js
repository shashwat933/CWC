import React, { useState } from 'react';
import image from '../assets/submit.png';

const Home = () => {
    const [messages, setMessages] = useState([
        { sender: 'bot', message: 'Say "Hi" to start the conversation!! ' }
    ]);
    const [inputMessage, setInputMessage] = useState('');

    const handleInputChange = (event) => {
        setInputMessage(event.target.value);
    };

    const submitHandler = (e) => {
        e.preventDefault();
        const newMessage = { sender: 'user', message: inputMessage };
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        setInputMessage('');
    };

    return (
        <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', position: 'relative', color: '#333' }}>
            {/* Header */}
            <header style={{
                textAlign: 'center',
                padding: '16px',
                backgroundColor: '#007BFF',
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold',
                boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.2)'
            }}>
                PING.SRV
            </header>

            {/* Chat Messages */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '70px', paddingTop: '20px' }}>
                <div style={{ width: '80%' }}>
                    {messages.map((message, index) => (
                        <div key={index} style={{ padding: '10px' }}>
                            {message.sender === 'user' && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <p style={{ backgroundColor: '#007BFF', color: 'white', padding: '8px', fontSize: '16px', borderRadius: '10px' }}>{message.message}</p>
                                </div>
                            )}
                            {message.sender === 'bot' && (
                                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                    <p style={{ backgroundColor: '#babdbf', color: '#333', padding: '8px', fontSize: '16px', borderRadius: '10px' }}>{message.message}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Input Form */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                width: '100%',
                backgroundColor: 'white',
                padding: '10px',
                boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.1)'
            }}>
                <form style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} onSubmit={submitHandler}>
                    <input
                        type='text'
                        placeholder='Enter your response...'
                        value={inputMessage}
                        onChange={handleInputChange}
                        style={{ width: '80%', borderRadius: '5px', padding: '10px', outline: 'none', border: '1px solid #ccc', }}
                    />
                    <button type='submit' style={{ border: 'none', background: 'none', cursor: 'pointer', marginLeft: '10px' }}>
                        <img style={{ height: '30px' }} src={image} alt='submit' />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Home;
