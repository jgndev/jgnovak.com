---
layout: ../../layouts/PostLayout.astro
title: Building a contact form
author: Jeremy Novak
description: Building a Contact Form for my Portfolio site
date: May 9th 2023
path: articles/build-a-contact-form
shortPath: build-a-contact-form
logo: https://jgnportfoliostorage.blob.core.windows.net/portfolio/email-circle-logo.svg
---

## Background

One of the really great things about <a href="https://astro.build" target="_blank" aria-label="Astro">Astro</a> is that
you can mix in <a href="https://react.dev" target="_blank" aria-lable="React">React</a> <em>when you want to</em> and
otherwise let the build system create lightning-fast static pages for you.

I did start down the path of coding up some vanilla TypeScript to do an
old-school contact form inside a `<script></script>` tag but soon realized that
the amount of work to make something I was happy with was going to be more than I really wanted to do.

Astro achieves this ability to mix in other JavaScript frameworks like React,
Vue and Svelte through something
called <a href="https://docs.astro.build/en/concepts/islands/" target="_blank" aria-lable="Astro Islands">Astro
Islands</a>.
There are also some cool options for when the Island loads called
<a href="https://docs.astro.build/en/reference/directives-reference/#client-directives" target="_blank" aria-label="Client Directives">
Client Directives</a>.
For example, you could only render the Island component when it is visible on screen
with `<MyComponentName client:visible />`.

There are two parts to sending email from a form. You need some kind of service
that knows how to send email, and you need a form on the client for letting a
user create the email they want to send.

For the time being, I'm giving the free tier of
<a href="https://sendgrid.com" target="_blank" aria-lable="SendGrid">SendGrid</a>
a try. You can check out the
<a href="https://docs.sendgrid.com/for-developers/sending-email/quickstart-nodejs" target="_blank" aria-label="SendGrid Quick Start Guide">
Quick Start Guide</a>
for a simplified example of how to use SendGrid to send an email. It requires
you to have a domain and to authorize that domain for sending email. I won't
cover that here, if you are interested in trying it the gist is you set some MX records that SendGrid gives you
in your domain name DNS records and get an API key. The instructions were pretty easy to follow.

I had a good experience
creating <a href="https://github.com/jgnovakdev/pwbot-api" target="_blank" aria-label="PWB0T API">PWB0T API</a>
on <a href="https://vercel.com/docs/concepts/functions/serverless-functions" target="_blank"  aria-label="Vercel Serverless Functions">
Vercel Serverless Functions</a>
so I went that route again for
this <a href="https://github.com/jgnovakdev/mailer-serverless" target="_blank"  aria-label="Mailer Serverless">
mailer-serverless</a> function.

The Front End component is written in React and fires off a `POST` request to the
handler on Vercel at `https://theservername/api/mailer`. The mailer-serverless function
takes care of it from there. I wanted one more feature for this, and that is to add
some really simple logging to <a href="https://aws.amazon.com/dynamodb/" target="_blank" aria-label="AWS DynamoDB">AWS
DynamoDB</a>
that I could possibly use later if nothing else to get an idea about the number of messages and how many failures there
are.

From here this article is broken up into two
sections. [Creating the Vercel Serverless Function](#creating-the-vercel-serverless-function)
and [Creating the React Contact Form](#creating-the-react-contact-form)

## Creating the Vercel Serverless Function

The AWS DynamoDB part is very optional, and in reality I did this last after everything was working. For this article
though,
I'll cover it first, so we can move on to the Vercel Serverless function and not have to re-visit the extra code it
adds.

### Creating AWS Resources for DynamoDB

The following steps assume you have an AWS Account, that you have installed
the <a href="https://aws.amazon.com/cli/" target="_blank" aria-label="AWS CLI">AWS CLI</a>,
have
created <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/security-creds.html" target="_blank" aria-label="AWS Access Keys">
AWS Access Keys</a> for your
account, and have run `aws configure` in the CLI. If you are unfamiliar with AWS those things combined are somewhat
involved the first time, but I encourage you to check it out.

We don't want to use an account that has any rights to do anything other than read
and write operations to a specific DynamoDB table from something like a serverless
function. To address that we'll first create a user that is only for that purpose
and give it
an <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_compare-resource-policies.html" target="_blank" aria-label="IAM Role">
IAM Role</a>.

I'm calling mine `jgn-vercel-user` because I'm unlikely to forget what it is for (I hope).

```bash
aws iam create-user --user-name jgn-vercel-user
```

Next we'll create the DynamoDB table. I gave mine a name that I hope will be obvious
to me at a later time what it was for. This becomes a *thing* if you build a lot of
stuff messing around :)

```bash
aws dynamodb create-table \
--table-name jgnovak-com-sent-messages \
--attribute-definitions AttributeName=message-log,AttributeType=S \
--key-schema AttributeName=message-log,KeyType=HASH 
--provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

Great, now we need to creat an IAM Policy for the DynamoDB table.

```bash
aws iam create-policy --policy-name jgn-vercel-db-access --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "dynamodb:BatchGetItem",
                "dynamodb:BatchWriteItem",
                "dynamodb:PutItem",
                "dynamodb:DeleteItem",
                "dynamodb:GetItem",
                "dynamodb:Query",
                "dynamodb:Scan",
                "dynamodb:UpdateItem"
            ],
            "Resource": "arn:aws:dynamodb:*:*:table/jgnovak-com-sent-messages"
        }
    ]
}'
```

Next we attach it to the user `jgn-vercel-user`. Remember to replace `<YOUR_ACCOUNT_ID>`
with your actual account id.

```bash
aws iam attach-user-policy --policy-arn arn:aws:iam::<YOUR_ACCOUNT_ID>:policy/jgn-vercel-db-access --user-name jgn-vercel-user
```

The last piece we will need as far as DynamoDB goes is to create access keys for
the user `jgn-vercel-user`. We will get an `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

Remember to store these some place where you won't lose them. We'll be using them
as Vercel environment variables here in just a bit.

```bash
aws iam create-access-key --user-name jgn-vercel-user
```

### Creating the Vercel Serverless Function

We'll be using the <a href="https://www.npmjs.com/package/vercel" target="_blank" aria-label="Vercel CLI">Vercel CLI</a>
which is installed with <a href="https://www.npmjs.com/" target="_blank" aria-lable="npm">npm</a>.

If you haven't already installed it, you can do so with

```bash
sudo npm install -g vercel@latest
```

I'm placing this one under my `~/projects/portfolio` directory, and will need a new empty
directory to create the project.

```bash
mkdir ~/projects/portfolio/mailer-serverless && cd ~/projects/portfolio/mailer-serverless
```

We don't need that much to get started, just an `npm init`.

```bash
npm init -y
```

Vercel Serverless functions work out of the `api` directory, so we just have to
create a new TypeScript file *with the same name* that we want the route to be.
For example, I want the route to be `/api/mailer`, so I need to name my file
`mailer.ts`.

```bash
mkdir api && touch api/mailer.ts
```

It is my preference to create a new Interface for any types I need, and I'll put
them in a new `interfaces` folder under `api`.

```bash
mkdir api/interfaces
```

```bash
touch api/interfaces/message.ts api/interfaces/messageRequest.ts
```

The `Message` interface is what expect to send off to SendGrid.

`message.ts`

```typescript
export interface Message {
    to: string,
    from: string,
    subject: string,
    html: string,
}
```

The `MessageRequest` interface is what we expect the Contact form to send us
when the user clicks "Send Message".

`messageRequest.ts`

```typescript
export interface MessageRequest {
    name: string;
    email: string;
    phone: string | null;
    message: string;
}
```

Before we continue on to the `mailer.ts`, we need some more packages! This *should*
be all this project needs.

```bash
npm install typescript @types/node @vercel/node @sendgrid/mail aws-sdk
```

Next we'll move on the `handler.ts` file.

### Creating the handler

I'm going to talk about the code a bit out of order, and then show you the whole
thing at the end. We'll start with the `handler` function itself since it is really
the main piece of code in the function.

```typescript
const handler = async (request: VercelRequest, response: VercelResponse) => {
    const body = request.body as MessageRequest;

    const html = `
        <div>
            <span>From: ${body.name}</span><br />
            <span>Email: ${body.email}</span><br />
            <span>Phone: ${body.phone}</span><br />
            <span>Subject: Message from ${body.name}</span><br />
            <span>Message: ${body.message}</span><br />
        </div>
    `;

    const message: Message = {
        to: process.env.EMAIL_RECIPIENT,
        from: process.env.EMAIL_SENDER,
        subject: `New message from ${body.name}`,
        html: html,
    };

    try {
        await sendMail(message);
        return response.status(200).send("Email sent!");
    } catch (error) {
        console.error(error);
        return response.status(500).send('Error sending email');
    }
}
```

Nothing too shocking. We take in a request sent from the caller *as a* `MessageRequest`
and make it into some very simple HTML called `html`.

Then we turn that into a `Message` that will be sent off to the `sendMail` function
to actually send the message.

If all goes okay, we can return a 200 (OK) to the caller. If not we can return a 500
because something has gone wrong on our end (the function's end).

Before I can talk about the `sendMail` function, I want to show you the bits about
authenticating to AWS and getting a DynamoDB client object to work with.

This function will read environment variables we are going to set here in a bit
and use those to authenticate with AWS. This is what the Secret Key stuff we did
earlier is for.

```typescript
const getAwsCredentials = (): Credentials => {
    return new Credentials({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
}
```

Next we need to get a `DynamoClient` and it seemed handy to do that in a function
that can be called in multiple places.

```typescript
const getDynamoClient = async () => {
    const credentials = await getAwsCredentials();
    return new AWS.DynamoDB.DocumentClient({
        region: process.env.AWS_REGION,
        credentials,
    });
}
```

At the very top of the file we also read the `AWS_REGION`, like Azure, with AWS
you usually have to specify what region the thing you want is or where it should be.
`AWS_REGION` will be set in environment variables here in a bit.

```typescript
AWS.config.update({region: process.env.AWS_REGION});
```

Now that we have those things covered, let's look at the `sendMail` function.

```typescript
const sendMail = async (message: Message) => {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    try {
        await sgMail.send(message);

        const db = await getDynamoClient();
        const timestamp = new Date().toISOString();

        const params = {
            TableName: 'jgnovak-com-sent-messages',
            Item: {
                'PK': `MESSAGE#${timestamp}`,
                'SK': `MESSAGE#${timestamp}`,
                'message-log': `MESSAGE#${timestamp}`,
                'to': message.to,
                'from': message.from,
                'subject': message.subject,
                'html': message.html,
                'timestamp': timestamp,
                'status': 'success'
            }
        };

        await db.put(params).promise();
        console.log(`[SUCCESS]: Message logged to DynamoDB`);

    } catch (error) {
        const db = await getDynamoClient();
        const timestamp = new Date().toISOString();
        const params = {
            TableName: 'jgnovak-com-sent-messages',
            Item: {
                'PK': `MESSAGE#${timestamp}`,
                'SK': `MESSAGE#${timestamp}`,
                'message-log': `MESSAGE#${timestamp}`,
                'to': message.to,
                'from': message.from,
                'subject': message.subject,
                'html': message.html,
                'timestamp': timestamp,
                'status': 'error'
            }
        };

        await db.put(params).promise();
        console.log(`[ERROR]: Problem sending the message. ${error}`);
    }
}
```

Very little of the code actually does the mail sending. If we removed the
parts for writing to DynamoDB it would be a short function. All we would
really need to do is call `sgMail.send(message)` and do whatever makes sense
if there is an error.

Because the function writes to DynamoDB there is a bit more code involved,
but I think the tradeoff is a good one as we have some way to persist that
an email was *attempted*. We can log both successes and failures in a way
that might be useful later.

### Setting environment variables for Vercel

Using the Vercel CLI we can set our environment variables while developing in a way
that will persist when we publish to Vercel Serverless which is pretty cool.

We have three for this function that we need to set for AWS. `AWS_REGION`, `AWS_ACCESS_KEY_ID`
and `AWS_SECRET_ACCESS_KEY`.

With each command we will be prompted for the of the variable, and which environment
(Production, Development, etc.) the variable is for. I set them all the same with the `a`
option when prompted.

```bash
vercel env add AWS_REGION
```

```bash
vercel env add AWS_ACCESS_KEY_ID
```

```bash
vercel env add AWS_SECRET_ACCESS_KEY
```

We are now ready to test locally, and can do so with the `vercel dev` command. The Vercel
CLI will prompt you with a few questions in the initial setup. This will also create a
.vercel directory in your project.

Up to this point I haven't mentioned, but it should be obvious by now that you need
an account on Vercel to deploy to Vercel.

```bash
vercel dev
```

I sometimes need the function to listen on a different port other than `:3000`, you
can do that with the `--listen` option.

```bash
vercel dev --listen 5000
```

If you have followed along to this point repeating all the steps, hopefully you have
a working Vercel serverless function running on your machine.

### Configuring CORS

The Vercel documentation mentions a couple ways to handle CORS, but for the sake
of brevity I'm going to talk about the `vercel.json` file at the root of the project
which is the option that worked for me for this function.

With this in place your browser based apps like a React app shouldn't have any
trouble with CORS from the function.

If I recall there is a little bit different setup if you happen to be doing
Vercel serverless functions with Next.js.

```json
{
  "routes": [
    {
      "src": "/api/.*",
      "methods": [
        "GET",
        "POST",
        "OPTIONS"
      ],
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
        "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization"
      }
    }
  ]
}
```

The other way for a Node.js project is to do the CORS stuff in the handler file, and that looks like this.

```typescript
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }
    return await fn(req, res)
}

const handler = async (request: VercelRequest, response: VercelResponse) => {
    // ... your handler code goes here
}

module.exports = allowCors(handler);
```

This worked fine for me for another project but my personal Portfolio didn't seem to get
along with this way of setting the CORS headers as well and works better with the
`vercel.json` CORS option. If you struggle with this I'd recommend giving
the <a href="https://vercel.com/guides/how-to-enable-cors" target="_blank" aria-lable="Vercel Documentation">official
document from Vercel</a> a read and see if it has an answer for your situation.

### Deploying to Vercel

This one is easy, when you are ready to deploy to Vercel just give it the ol' `vercel deploy`.

```bash
vercel deploy
```

That concludes the first half of the article talking about the Vercel Serverless Function
written in TypeScript for sending email.

You can view the full source code for this project
on <a href="https://github.com/jgnovakdev/mailer-serverless" target="_blank" aria-label="GitHub">GitHub</a>.

## Creating the React Contact Form

The React side is made up a few parts. Some state for things that the form needs to work on, simple validation methods,
and the method that actually takes the values in the form and sends a `POST` to the Vercel function to send the email.

### State

The state used in the Contact form could probably be simplified but as-is we are setting state for the data
that is going to come from the user (name, email, phone, message). Then we have some state for UI situations
like is the form submitting and are we showing a Modal (isSubmitting, showModal). We also want some state
for errors that we can display on the form to prompt a user to fix something like an invalid email. Finally,
some state that is used to check if the parts that need to be valid are, and if so they can send the message.

```typescript jsx
function EmailBlock() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [errors, setErrors] = useState({
        name: "",
        email: "",
        message: "",
    })
    const [nameValid, setNameValid] = useState(false);
    const [emailValid, setEmailValid] = useState(false);
    const [messageValid, setMessageValid] = useState(false);
    // ... more code  
}
```

### Validation

The validation functions are very simple. These are called `onBlur` to just check that
the thing the user put in is valid by some intentionally loose rules and puts an
error message into the errors to display if something is wrong with it. For example
if the email address is not valid, display a message so they know it needs to be fixed.

I intentionally don't check the phone number, and am okay with the name and message
values being anything other than empty. The form is meant to be easy to use, and I don't
want to hassle people about rigid requirements to send a message. If some emails
are junk, that's fine.

```typescript jsx
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
```

### Closing the Modal

When the user submits their message I want the fields to be set back to blank
which will also disable sending the message again.

This is just my intuition that if you click "Send Message", then a Modal appears
telling you the message sent... you shouldn't end up back on a page with everything
you typed in and an active "Send Message" button staring back at you. Some people,
perhaps most, might wonder what is going on and try sending it again, and again,
and again thinking it doesn't work.

So it makes sense to me to just blank those fields out so they return to a "fresh"
form with nothing in it and would have to type it all again to send another message.

```typescript jsx
    const handleClose = () => {
    setShowModal(false);
    setName("");
    setEmail("");
    setPhone("");
    setMessage("");
}
```

### Submitting the Email

This function is a bit long for what it does, but the main thing is to handle sending a `POST`
to the remote endpoint (the mailer-serverless function) via the `fetch` API.

The rest is an exercise in getting the pieces of state right so that the user experience
with the form feels okay. I'm sure I'll be revisiting this one, but as of the time of this
writing it works well enough to give to users to let them start sending me messages.

```typescript jsx
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
        const response = await fetch("https://the-remote-server/api/mailer", {
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
```

### The JSX

If you check out the `onBlur` and `onChange` you'll notice that I'm doing a validation on
each. This was because in my testing using AutoFill from my browser I was getting behavior
that I didn't like. Namely, the inputs that were autofilled were never validated, so
the "Send Message" button didn't light up (become enabled) until the user clicks into
the field and then clicks out. That's bad UX plain and simple, and most people would
just think your thing is broken and not bother. All the same it is repetitive and will
be something for me to look into again another day.

I wanted the button to have three different messages. "NOT READY TO SEND", if the inputs
aren't present that are required (name, email and message). "SEND MESSAGE" if everything
looks good and ready to send. "SENDING..." while the `handleSubmit` code is doing its thing.

The modal is simply showing or not showing. When showing it covers the entire screen
with a semi-transparent black background and shows a dialogue looking frame letting
the user know the message was sent and an "OK" button to close it.

As of the time of this writing I haven't moved the Tailwind CSS classes out of the JSX
yet into the `style.css` with a sensible name. I do love working with Tailwind because
it is so declarative in styling a page, but when it runs off the page it does look pretty messy.

```typescript jsx
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
                <button type="submit" disabled={!nameValid || !emailValid || !messageValid} className="black-button"
                        aria-label="Send Message">
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
```

## Wrapping up

That concludes this article. I hope you enjoyed reading it and maybe picked up a thing or two. Maybe it gave
you some ideas for your own projects.

If you are interested you can check out the source code
on <a href="https://github.com/jgnovakdev/jgnovak.com/blob/main/src/components/react/EmailBlock.tsx" target="_blank" aria-label="GitHub">
GitHub</a>.

-JGN
