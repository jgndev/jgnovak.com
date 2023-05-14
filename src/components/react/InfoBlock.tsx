import {useEffect, useRef, useState} from 'react';

function InfoBlock() {

    // Display the current time on as HH:MM AM/PM
    const [currentTime, setCurrentTime] = useState("")
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        setTime();
        const interval = setInterval(setTime, 15000);
        return () => clearInterval(interval);
    }, []);

    function setTime() {
        const date = new Date();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedTime = hours % 12 + ":" + (minutes < 10 ? "0" : "") + minutes + " " + ampm;
        setCurrentTime(formattedTime)
    }

    // Copy email address to clipboard
    const textRef = useRef(null);

    function copyToClipboard() {
        setShowTooltip(true);
        const textToCopy = textRef.current?.innerText;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            setTimeout(() => setShowTooltip(false), 1000);
        }
    }

    // Define primary and secondary styles for use in SVGs
    const primaryStyle = {
        fill: 'currentColor'
    }

    const secondaryStyle = {
        fill: 'currentColor',
        opacity: 0.4,
    }


    return (
        <div className="contact-form-left">
            <div>
                <h2 className="secondary-header">Let's Connect</h2>
            </div>
            <div className="flex mt-10 p-4 space-x-6 items-center">
                <svg className="contact-form-icon" fill="currentColor" viewBox="0 0 512 512">
                    <path
                        style={primaryStyle}
                        d="M380.7 185.8c5.1-6.7 4.2-16.2-2.1-21.8s-15.9-5.3-21.9 .7l-179 179-13 13c-3 3-4.7 7.1-4.7 11.3v8 56 48c0 13.2 8.1 25 20.3 29.8s26.2 1.6 35.2-8.1L284 427.7l-60-25V389.4L380.7 185.8z">
                    </path>
                    <path
                        style={secondaryStyle}
                        d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L224 402.7V389.4L380.7 185.8c5.2-6.7 4.2-16.4-2.3-21.9s-16.1-5.1-22 1.1L178.8 350.6l-14.1 14.1c-3 3-4.7 7.1-4.7 11.3l-28.3-11.8-112-46.7C8.4 312.8 .8 302.2 .1 290s5.5-23.7 16.1-29.8l448-256c10.7-6.1 23.9-5.5 34 1.4z">
                    </path>
                </svg>
                <span ref={textRef} id="email-address" className="contact-span">
                    jeremy@jgnovak.com
                </span>
                <button onClick={copyToClipboard} className="clipboard" aria-label="Copy to clipboard">
                    <svg
                        id="clipboard-icon"
                        className="contact-form-icon cursor-pointer"
                        fill="currentColor"
                        viewBox="0 0 512 512">
                        <path
                            style={primaryStyle}
                            d="M224 48c0-26.5 21.5-48 48-48H396.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V336c0 26.5-21.5 48-48 48H272c-26.5 0-48-21.5-48-48V48z">
                        </path>
                        <path
                            style={secondaryStyle}
                            d="M192 128H48c-26.5 0-48 21.5-48 48V464c0 26.5 21.5 48 48 48H272c26.5 0 48-21.5 48-48V416H256v32H64V192H192V128z">
                        </path>
                    </svg>
                </button>
                {showTooltip && <div className="tooltip">Copied!</div>}
            </div>
            <div className="flex mt-2 p-4 space-x-6 items-center">
                <svg className="contact-form-icon" fill="currentColor" viewBox="0 0 512 512">
                    <path
                        style={primaryStyle}
                        d="M256 96c-13.3 0-24 10.7-24 24V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24z">
                    </path>
                    <path
                        style={secondaryStyle}
                        d="M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z">
                    </path>
                </svg>
                <span className="contact-span">Central Standard Time</span>
                <span id="current-time" className="contact-span">
                    {currentTime}
                </span>
            </div>
            <div className="flex mt-2 p-4 space-x-6 items-center">
                <svg className="contact-form-icon" fill="currentColor" viewBox="0 0 384 512">
                    <path
                        style={primaryStyle}
                        d="M192 144a48 48 0 1 0 0 96 48 48 0 1 0 0-96z">
                    </path>
                    <path
                        style={secondaryStyle}
                        d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 112a80 80 0 1 1 0 160 80 80 0 1 1 0-160z">
                    </path>
                </svg>
                <span className="contact-span">Weatherford, Texas - USA</span>
            </div>
        </div>
    );
}

export default InfoBlock;