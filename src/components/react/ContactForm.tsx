import React, {ChangeEvent, useEffect, useRef, useState} from 'react';

export default function ContactForm() {
    // Display the current time on as HH:MM AM/PM
    const [currentTime, setCurrentTime] = useState("")
    const [showTooltip, setShowTooltip] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [errors, setErrors] = useState({
        name: "",
        email: "",
        message: "",
    })
    const [nameValid, setNameValid] = useState(false);
    const [emailValid, setEmailValid] = useState(false);
    const [messageValid, setMessageValid] = useState(false);

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

    function copyToClipboard() {
        setShowTooltip(true);
        const textToCopy = textRef.current?.innerText;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            setTimeout(() => setShowTooltip(false), 1000);
        }
    }

    // Validation functions
    const validateName = (name: string) => {
        const errorsLocal = {...errors};
        if (name.trim().length <= 0) {
            errorsLocal.name = "Please share your name";
            setErrors(errorsLocal);
            setNameValid(false);
            return false;
        } else {
            errorsLocal.name = "";
            setErrors(errorsLocal);
            setName(name);
            setNameValid(true);
            return true;
        }
    }

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const valid = emailRegex.test(email);

        const errorsLocal = {...errors};

        if (!valid) {
            errorsLocal.email = "Please use a valid email address";
            setErrors(errorsLocal);
            setEmailValid(false);
            return false;
        } else {
            errorsLocal.email = "";
            setErrors(errorsLocal);
            setEmail(email);
            setEmailValid(true);
            return true;
        }
    }

    const validateMessage = (message: string) => {
        const errorsLocal = {...errors};
        setMessage(message);

        if (message.trim().length <= 0) {
            errorsLocal.message = "Please share your message";
            setErrors(errorsLocal);
            setMessageValid(false);
        } else {
            errorsLocal.message = "";
            setErrors(errorsLocal);
            setMessageValid(true);
        }
    }

    // Post the message to the remote service
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!nameValid || !emailValid || !messageValid) {
            return;
        }

        setNameValid(false);
        setEmailValid(false);
        setMessageValid(false);

        setIsSubmitting(true);
        setShowModal(true);

        const body = {
            name,
            email,
            phone,
            message
        };

        try {
            const response = await fetch("https://mailer-api-mu.vercel.app/api/mailer", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            console.log(response);

            if (response.ok) {
                // setShowModal(true);
                setName("");
                setEmail("");
                setPhone("");
                setMessage("");
            } else {
                console.error("Error sending message")
            }

        } catch (error) {
            console.error(error);
        } finally {
            setName("");
            setEmail("");
            setPhone("");
            setMessage("");
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setShowModal(false);
        setName("");
        setEmail("");
        setPhone("");
        setMessage("");
    }

    // Copy email address to clipboard
    const textRef = useRef(null);

    // Define primary and secondary styles for use in SVGs
    const primaryStyle = {
        fill: 'currentColor'
    }

    const secondaryStyle = {
        fill: 'currentColor',
        opacity: 0.4,
    }

    return (
        <div className="relative isolate bg-zinc-900 ring ring-zinc-700/20 rounded-md">
            <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-2">
                <div className="relative px-6 pb-20 pt-24 sm:pt-32 lg:static lg:px-8 lg:py-48">
                    <div className="mx-auto max-w-xl lg:mx-0 lg:max-w-lg">
                        <div
                            className="absolute inset-y-0 left-0 -z-10 w-full overflow-hidden ring-1 ring-white/5 lg:w-1/2">
                            <svg
                                className="absolute inset-0 h-full w-full stroke-zinc-700 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
                                aria-hidden="true"
                            >
                                <defs>
                                    <pattern
                                        id="54f88622-e7f8-4f1d-aaf9-c2f5e46dd1f2"
                                        width={200}
                                        height={200}
                                        x="100%"
                                        y={-1}
                                        patternUnits="userSpaceOnUse"
                                    >
                                        <path d="M130 200V.5M.5 .5H200" fill="none"/>
                                    </pattern>
                                </defs>
                                <svg x="100%" y={-1} className="overflow-visible fill-zinc-800/20">
                                    <path d="M-470.5 0h201v201h-201Z" strokeWidth={0}/>
                                </svg>
                                <rect width="100%" height="100%" strokeWidth={0}
                                      fill="url(#54f88622-e7f8-4f1d-aaf9-c2f5e46dd1f2)"/>
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-white">Let's Connect</h2>
                        <p className="mt-6 text-lg leading-8 text-zinc-300">
                            I would love to hear more about your project or open role, please send me a message.
                        </p>
                        <dl className="mt-10 space-y-8 text-base leading-7 text-zinc-300">
                            <div className="flex items-center gap-x-4">
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
                            <div className="flex items-center gap-x-4">
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
                            <div className="mt-4 flex gap-x-4 items-center">
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
                        </dl>
                    </div>
                </div>
                <form action="#" onSubmit={handleSubmit} className="px-6 pb-24 pt-20 sm:pb-32 lg:px-8 lg:py-48">
                    <div className="mx-auto max-w-xl lg:mr-0 lg:max-w-lg">
                        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                            <div>
                                <label htmlFor="first-name"
                                       className="block text-sm font-semibold leading-6 text-white">
                                    Name
                                </label>
                                <div className="mt-2.5">
                                    <input
                                        type="text"
                                        name="name"
                                        id="name"
                                        value={name}
                                        autoComplete="given-name"
                                        onBlur={(e) => validateName(e.target.value)}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            validateName(e.target.value);
                                        }}
                                        className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                    />
                                    {errors.name && <p className="text-rose-400">{errors.name}</p>}
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="email" className="block text-sm font-semibold leading-6 text-white">
                                    Email
                                </label>
                                <div className="mt-2.5">
                                    <input
                                        type="email"
                                        name="email"
                                        id="email"
                                        value={email}
                                        autoComplete="email"
                                        onBlur={(event) => validateEmail(event.target.value)}
                                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                            setEmail(event.target.value);
                                            validateEmail(event.target.value);
                                        }}
                                        className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                    />
                                    {errors.email && <p className="text-rose-400">{errors.email}</p>}
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="phone-number"
                                       className="block text-sm font-semibold leading-6 text-white">
                                    Phone Number (optional)
                                </label>
                                <div className="mt-2.5">
                                    <input
                                        type="tel"
                                        name="phone"
                                        id="phone"
                                        value={phone}
                                        autoComplete="tel"
                                        onBlur={(event: React.FocusEvent<HTMLInputElement>) => setPhone(event.target.value)}
                                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPhone(event.target.value)}
                                        className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                    />
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="message" className="block text-sm font-semibold leading-6 text-white">
                                    Message
                                </label>
                                <div className="mt-2.5">
                                  <textarea
                                      name="message"
                                      id="message"
                                      value={message}
                                      rows={4}
                                      onBlur={(event: React.FocusEvent<HTMLTextAreaElement>) => validateMessage(event.target.value)}
                                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                                          setMessage(event.target.value);
                                          validateMessage(event.target.value);
                                      }}
                                      className="block w-full rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                  />
                                    {errors.message && <p className="text-rose-400">{errors.message}</p>}
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end 2xl:justify-start">
                            <button
                                type="submit"
                                disabled={!nameValid || !emailValid || !messageValid}
                                className="w-full md:max-w-[14rem] rounded-md bg-indigo-500 border border-indigo-400 disabled:bg-zinc-700 disabled:border-zinc-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                            >
                                <div className="flex items-center justify-center gap-x-4">
                                    <svg className="w-[1.25em]" xmlns="http://www.w3.org/2000/svg" width="32"
                                         height="32"
                                         viewBox="0 0 512 512">
                                        <path
                                            d="M452.1 49L52.3 265.3c-6 3.3-5.6 12.1.6 14.9l68.2 25.7c4 1.5 7.2 4.5 9 8.4l53 109.1c1 4.8 9.9 6.1 10 1.2l-8.1-90.2c.5-6.7 3-13 7.3-18.2l207.3-203.1c1.2-1.2 2.9-1.6 4.5-1.3 3.4.8 4.8 4.9 2.6 7.6L228 338c-4 6-6 11-7 18l-10.7 77.9c.9 6.8 6.2 9.4 10.5 3.3l38.5-45.2c2.6-3.7 7.7-4.5 11.3-1.9l99.2 72.3c4.7 3.5 11.4.9 12.6-4.9L463.8 58c1.5-6.8-5.6-12.3-11.7-9z"
                                            fill="currentColor"/>
                                    </svg>
                                    <span>
                                        {isSubmitting ?
                                            "SENDING..."
                                            : nameValid && emailValid && messageValid
                                                ? "SEND MESSAGE"
                                                : "NOT READY"
                                        }
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>
                    {showModal && (
                        <div className="fixed z-50 inset-0 overflow-y-auto">
                            <div className="flex items-center justify-center text-center min-h-screen">
                                <div
                                    className="bg-black opacity-90 fixed top-0 left-0 w-full h-full"></div>
                                <div className="relative p-8 bg-zinc-800 ring ring-zinc-700/80 rounded-lg shadow-lg">
                                    <p className="mb-4 uppercase font-bold text-4xl text-zinc-200">Thanks!</p>
                                    <p className="text-zinc-300">Your message was sent, I will get it soon.</p>
                                    <div className="mt-6 flex justify-center">
                                        <button
                                            className="py-2 px-4 font-bold text-white bg-zinc-900 hover:bg-zinc-950 rounded-md"
                                            onClick={handleClose}
                                        >
                                            OK
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    )
}
