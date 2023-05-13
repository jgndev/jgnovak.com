import React, {ChangeEvent, useState} from "react";

function EmailBlock() {

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

    const handleClose = () => {
        setShowModal(false);
        setName("");
        setEmail("");
        setPhone("");
        setMessage("");
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!nameValid || !emailValid || !messageValid) {
            return;
        }

        setNameValid(false);
        setEmailValid(false);
        setMessageValid(false);

        setIsSubmitting(true);

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

            if (response.ok) {
                setShowModal(true);
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
            setIsSubmitting(false);
        }
    };

    return (
        <div className="contact-form-right">
            <form onSubmit={handleSubmit} className="w-full p-4" id="contact-form">
                <div>
                    <label htmlFor="name">Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={name}
                        onBlur={(e) => validateName(e.target.value)}
                        onChange={(e) => {
                            setName(e.target.value);
                            validateName(e.target.value);
                        }}
                    />
                    {errors.name && <p>{errors.name}</p>}
                </div>

                <div className="my-6">
                    <div className="relative mt-6">
                        <label htmlFor="email">Email</label>
                        <input
                            type="text"
                            id="email"
                            name="email"
                            value={email}
                            onBlur={(e) => validateEmail(e.target.value)}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                validateEmail(e.target.value);
                            }}
                        />
                        {errors.email && <p>{errors.email}</p>}
                    </div>
                </div>

                <div className="my-6">
                    <div className="relative mt-6">
                        <label htmlFor="phone" className=""> Phone Number (Optional)</label>
                        <input
                            type="text"
                            id="phone"
                            name="phone"
                            value={phone}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setPhone(event.target.value)}
                        />
                    </div>
                </div>

                <div className="my-6">
                    <label htmlFor="message" className="block mb-2 text-sm font-medium">Message</label>
                    <textarea
                        id="message"
                        name="message"
                        rows={6}
                        value={message}
                        onBlur={(e) => validateMessage(e.target.value)}
                        onChange={(e) => {
                            setMessage(e.target.value);
                            validateMessage(e.target.value);
                        }}

                    >
                    </textarea>
                    {errors.message && <p>{errors.message}</p>}
                </div>

                <div className="my-6">
                    <button type="submit" disabled={!nameValid || !emailValid || !messageValid} className="black-button" aria-label="Send Message">
                        <svg className="w-[1.25em]" xmlns="http://www.w3.org/2000/svg" width="32" height="32"
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
                                : "NOT READY TO SEND"
                            }
                        </span>
                    </button>
                </div>

                {showModal && (
                    <div className="fixed z-50 inset-0 overflow-y-auto">
                        <div className="flex items-center justify-center text-center min-h-screen">
                            <div className="bg-black opacity-80 fixed top-0 left-0 w-full h-full"></div>
                            <div className="relative p-8 bg-white dark:bg-zinc-800 rounded-lg shadow-lg">
                                <p className="mb-4 uppercase font-bold text-4xl dark:text-zinc-200">Thanks!</p>
                                <p className="dark:text-zinc-300">Your message was sent, I will get it soon.</p>
                                <div className="mt-6 flex justify-center">
                                    <button
                                        className="py-2 px-4 font-bold text-white bg-zinc-800 hover:bg-zinc-950 rounded-md dark:bg-zinc-900 dark:hover:bg-zinc-950"
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
    );
}

export default EmailBlock;