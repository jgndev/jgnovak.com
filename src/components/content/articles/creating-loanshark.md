---
layout: ../../layouts/PostLayout.astro
title: Creating Loan Shark
author: Jeremy Novak
description: Building a Loan Calculator with Go and React on Azure
date: May 7th 2023
path: creating-loanshark
logo: https://jgnportfoliostorage.blob.core.windows.net/portfolio/loanshark-logo.svg
---

## Background

<a href="https://loanshark.jgnovak.net" target="_blank" rel="noreferrer">Loan Shark</a> is a portfolio project I built to
showcase a combination of <a href="https://learn.microsoft.com/en-us/azure/azure-functions/" target="_blank" rel="noreferrer">Azure Functions</a> and <a href="https://go.dev" target="_blank" rel="noreferrer">Go</a> for the Back End, 
and <a href="https://react.dev" target="_blank" rel="noreferrer">React</a> with <a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer">TypeScript</a> and <a href="https://redux-toolkit.js.org/" target="_blank" rel="noreferrer">Redux Toolkit</a> 
deployed to <a href="https://learn.microsoft.com/en-us/azure/static-web-apps/overview" target="_blank" rel="noreferrer">Azure Static Web Apps</a> for the Front End.

I chose to decouple the Front End and Back End for this project but could have kept all calculation logic in the
React app, and it would have worked just as well and would be *faster* after periods of inactivity. Many serverless things like
Azure Functions have a <a href="https://azure.microsoft.com/en-us/blog/understanding-serverless-cold-start/" target="_blank" rel="noreferrer">
cold start time</a> after periods of inactivity to save on cost among other reasons. Once the Azure Function is warmed up the delay becomes so minimal it may not even
be perceptible to a user, but on the first request after a period of inactivity you will notice cold start time leaving you unsure if you clicked the button before the data suddenly pops in.

For this project the solution I decided on to handle the wait during cold start times is to simply show a modal for a period
of time that I estimate to be slightly longer than the average cold start time. More about this in the second section of this 
article about the Front End.

From here this article is split into two main parts, [Creating the HTTP Trigger Function](#creating-the-http-trigger-function)
and [Creating the Front End in React](#creating-the-front-end-in-react).


## Creating the HTTP Trigger Function

I chose <a href="https://go.dev" target="_blank" rel="noreferrer">Go</a> for the backend language to get some practice
with it and because I think it should have pretty
fast <a href="https://azure.microsoft.com/en-us/blog/understanding-serverless-cold-start/" target="_blank" rel="noreferrer">
cold start times</a>.

Azure provides solid command line tools for working with resources with a choice of
<a href="https://azure.microsoft.com/en-us/blog/understanding-serverless-cold-start" target="_blank" rel="noreferrer">
Azure PowerShell</a>
or <a href="https://learn.microsoft.com/en-us/cli/azure/install-azure-cli" target="_blank" rel="noreferrer">
Azure CLI</a>. I'm developing on macOS and tend to lean towards the CLI more out of preference.

We will also need the <a href="https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=v4%2Cmacos%2Ccsharp%2Cportal%2Cbash" target="_blank" rel="noreferrer">
Azure Functions Core Tools</a> installed. Using this tool we can initialize a new function, test it locally
and publish directly to Azure when ready.

### Creating an HTTP Trigger Project

Start by creating a new directory for the Azure Function where the project will be initialized.
This app will go on my portfolio, so I'm placing it under `~/projects/portfolio` on my local machine.

```bash
cd ~/projects/portfolio
```

Create the project directory for the function and change into it, I'm calling it `loanshark-api`.

```bash
mkdir loanshark-api && cd loanshark-api
```

There are several prepared templates to use for languages like C#, JavScript and so on, you can read
more about
those <a href="https://learn.microsoft.com/en-us/azure/azure-functions/functions-get-started?pivots=programming-language-csharp" target="_blank" rel="noreferrer">
here</a>. For Go and Rust we need to choose Custom.

```bash
func init --worker-runtime custom 
```

### Creating the handler in GO

Next we will do the basic setup for a simple Go project. For `go mod init` I'm using the package
name `jgnovak.net/loanshark-api`. Choose something that sounds good to you, a common convention seems
to be *yourdomain*/*your-package-name*.

```bash
go mod init jgnovak.net/loanshark-api
```

I'm going to split the Go code up into files in `handlers` for the HTTP Handler, `models` for the structs that define
the request, response and payment - and `services` for the
logic that actually calculates the loan and returns a response to the handler to give to the caller.

```bash
mkdir handlers models services
```

For the sake of brevity in listing out the code, you can take a look at the source which is pretty short
on the <a href="https://github.com/jgnovakdev/loanshark-api" target="_blank" rel="noreferrer">GitHub Repo</a>.

The Go code can be found in the following files.

```bash
touch handlers/handler.go models/loanRequest.go models/loanResponse.go models/payment.go services/calculateLoan.go
```

The main code of interest to someone reading this article as an overview of creating Azure Functions with Go is found in `handlers/handler.go` and looks like this.

```go
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"jgnovak.net/loanshark-api/models"
	"jgnovak.net/loanshark-api/services"
)

func loanHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var loanRequest models.LoanRequest
	err := json.NewDecoder(r.Body).Decode(&loanRequest)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	loan := services.CalculateLoan(loanRequest)
	response, err := json.Marshal(loan)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_, err = w.Write(response)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func main() {
	listenAddr := ":8080"
	if val, ok := os.LookupEnv("FUNCTIONS_CUSTOMHANDLER_PORT"); ok {
		listenAddr = ":" + val
	}
	http.HandleFunc("/api/loans", loanHandler)
	log.Printf("About to listen on %s. Go to https://127.0.0.1%s/", listenAddr, listenAddr)
	log.Fatal(http.ListenAndServe(listenAddr, nil))
}
```

There are a few important notes to call out here. First is that this method only accepts
a POST request, so we want to check for that and return a message to the caller if something else is passed.

For handling <a href="https://developer.mozilla.org/en-US/docs/Glossary/CORS" target="_blank" rel="noreferrer">CORS</a> 
I recommend setting the option in the Azure Portal for the function after deployment. CORS can be handled in code, but
generally speaking with Azure you want to choose handling CORS in code or in Azure, not both. Once the Azure Function is created 
you just have to go to the portal page for your function, then to <em>API > CORS</em> and save your settings there.

In the `main` we need to define that the `loanHandler` method should be called for the route `/api/loans`.

### Creating the Azure Functions HTTP Trigger

The following specifies that we are using `Custom` (for Go and Rust), that we want the Azure Function to be of type `HttpTrigger`, then the path will be `loans` for this Azure Function (at `/api/loans`) and the access should
be `anonymous`.

```bash
func new -l Custom -t HttpTrigger -n loans -a anonymous
```

This will have created a new directory in the project called `loans` with a file called `function.json`.
The example listed below is the default except I removed `get` from the methods because the Azure Function only 
accepts a `POST` request.

```json
{
  "bindings": [
    {
      "authLevel": "Anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": [
        "post"
      ]
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

Finally, we need to tell the Azure Function what the executable is to run when it is triggered.
This needs to be specified in the `defaultExecutablePath`, and in this case it is the compiled
Go binary at the root directory named `handler`. Other than that the defaults were used for this
example.

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[3.*, 4.0.0)"
  },
  "customHandler": {
    "enableForwardingHttpRequest": true,
    "description": {
      "defaultExecutablePath": "handler",
      "workingDirectory": "",
      "arguments": []
    }
  }
}
```

### Building and Testing

Testing locally can be done by building the Go code and testing with the Azure Functions Core Tools.

First build the binary with `go build`

```go
go build handlers/handler.go
```

Then start the Azure Function with the Azure Function Core Tools for local testing.

```bash
func start
```

In the configuration following my example the port will be random high numbered port on localhost, for example `:64731`.
The console messages will mention `:7071` but that is not the port the Azure Function runs on for local testing in my experience. It will be
mentioned on another line in the output telling you the *real* port. I'm pretty certain that the local testing port can be hard coded,
but I did not look into it any further.

Here is an example of what that output looks like on my machine.

```
Azure Functions Core Tools
Core Tools Version:       4.0.5148 Commit hash: N/A  (64-bit)
Function Runtime Version: 4.17.3.20392


Functions:

	loans: [POST] http://localhost:7071/api/loans

For detailed output, run func with --verbose flag.
[2023-05-07T19:57:52.218Z] 2023/05/07 14:57:52 About to listen on :54049. Go to https://127.0.0.1:54049/
[2023-05-07T19:57:52.234Z] Worker process started and initialized.
[2023-05-07T19:57:56.800Z] Host lock lease acquired by instance ID '000000000000000000000000DB4F1B81'.
```

Testing the Azure Function can be done with either <a href="https://www.postman.com" target="_blank" rel="noreferrer">
Postman</a>
or <a href="https://curl.se" target="_blank" rel="noreferrer">curl</a>.

Here is an example with curl sending a post request to confirm that the response works as intended. Note the port, as
mentioned
previously this will likely be something different each time you test locally with `func start` if you use the same
configuration I did.

```bash
curl -X POST http://localhost:64731/api/loans -d '{"amount": 50000, "rate": 5.5, "term": 12}'
```

With the Azure Function tested and confirmed working locally, it is time to deploy to Azure Functions.

### Deployment to Azure Functions

Continuing on with the theme of using the Azure CLI, we'll first need to authenticate with Azure. 

```bash
az login
```

Azure Functions need a Resource Group and a Storage Account to work, so we'll create those first.
Each of the following commands will also return somewhat lengthy JSON output
from <a href="https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/overview" target="_blank" rel="noreferrer">
Azure Resource Manager</a>. I have omitted that here for brevity, but this output can be useful.

Resource group:

```bash
az group create --name jgn-api-rg --location "centralus"
```

Storage account:

```bash
az storage account create \
--name jgnapistorage \
--location "centralus" \
--resource-group jgn-api-rg \
--sku Standard_LRS \
--allow-blob-public-access false
```

There is one important detail here before publishing. I'm developing on an M1 MacBook Pro and have been compiling
without OS options for local testing. Before publishing to Azure the binary will need to be compiled for the target OS in Azure, Linux in this case.

```bash
GOOS=linux GOARCH=amd64 go build handlers/handler.go
```

To simplify this process for the future I turned that into a small bash script to run each time I want a clean build.

```bash
#!/bin/bash
echo "Cleaning previous builds..."
rm handler
echo "Building for Linux AMD64"
GOOS=linux GOARCH=amd64 go build handlers/handler.go
echo "New build created"
ls -lh handler
```

With that done, all that is left to do is publish to Azure. First we will create a Azure Function App in Azure,
and then publish the Function code to it.

Creating the Function App:

```bash
az functionapp create \
--resource-group jgn-api-rg \
--consumption-plan-location "centralus" \
--runtime custom \
--os-type Linux \
--functions-version 4 \
--name loanshark-api \
--storage-account jgnapistorage
```

Publishing to the Azure Function App:

```bash
func azure functionapp publish loanshark-api
```

Azure Functions have the domain name `func-name.azurewebsites.net`, once published we can test it at the public URL.

```bash
curl -X POST https://loanshark-api.azurewebsites.net/api/loans -d '{"amount": 50000, "rate": 5.5, "term": 12}'
```

Great! The Azure Function is published in Azure and confirmed working with a POST request to the public endpoint. You can get the 
full source code for the Function on <a href="https://github.com/jgnovakdev/loanshark-api" target="_blank" rel="noreferrer">GitHub</a>.


## Creating the Front End in React

I chose <a href="https://react.dev/" target="_blank" rel="noreferrer">React</a> for the Front End because the app I have
in mind is the definition of an SPA or "Single Page Application". I'm also going to use <a href="https://redux-toolkit.js.org/" target="_blank" rel="noreferrer">Redux Toolkit</a>
and <a href="https://tailwindcss.com" target="_blank" rel="noreferrer">Tailwind CSS</a> as two libraries to help simplify the state and CSS respectively.

### Handling State

Having the entire app in a single file is pretty straight forward, but I wanted to break the app into smaller pieces
with each responsible for rendering the bits that is supposed to handle. Some things like the payment schedule table
shouldn't even appear unless there is data to show, which is also a simple task in a single file React app. 

The tricky issue for me with React has been the concept described in the excellent <a href="https://react.dev/learn/thinking-in-react" target="_blank" rel="noreferrer">
Thinking in React</a> tutorial from the official documentation. For this project I reached for <a href="https://redux-toolkit.js.org/" target="_blank" rel="noreferrer">Redux Toolkit</a>
and gave it a try to handle state in a way that is easier for me to think about.

The concept is to define pieces of state in a *store* and provide a way that components use to either get or set a piece of state in a consistent way. Let's look at this piece by piece.

### Interface and initialState

Starting with an interface called `LoanState`, we define a piece of state for each thing that components in the app need to either read or write to.

```typescript
interface LoanState {
    amount: number;
    rate: number;
    term: number;
    monthlyPayment: string | null;
    totalInterest: string | null;
    totalCost: string | null;
    request: LoanRequest | null;
    response: LoanResponse | null;
    payments: Payment[];
    page: number;
}
```

We also need an `initialState` that the app will have on the first load to provide some good defaults and avoid bad behavior from a piece of state being `undefined`.

```typescript
const initialState: LoanState = {
    amount: 50000.0,
    rate: 5.5,
    term: 2,
    monthlyPayment: null,
    totalInterest: null,
    totalCost: null,
    request: null,
    response: null,
    payments: [],
    page: 1
};
```

### Creating the reducers

We'll create a slice called `loanSlice` with a list of reducers for the setter actions.

```typescript
export const loanSlice = createSlice({
    name: 'loan',
    initialState,
    reducers: {
        setAmount: (state, action: PayloadAction<number>) => {
            state.amount = action.payload;
        },
        setRate: (state, action: PayloadAction<number>) => {
            state.rate = action.payload;
        },
        setTerm: (state, action: PayloadAction<number>) => {
            state.term = action.payload;
        },
        setMonthlyPayment: (state, action: PayloadAction<string>) => {
            state.monthlyPayment = action.payload;
        },
        setTotalInterest: (state, action: PayloadAction<string>) => {
            state.totalInterest = action.payload;
        },
        setTotalCost: (state, action: PayloadAction<string>) => {
            state.totalCost = action.payload;
        },
        setRequest: (state, action: PayloadAction<LoanRequest | null>) => {
            state.request = action.payload;
        },
        setResponse: (state, action: PayloadAction<LoanResponse | null>) => {
            state.response = action.payload;
        },
        setPayments: (state, action: PayloadAction<Payment[] | []>) => {
            state.payments = action.payload;
        },
        setPage: (state, action: PayloadAction<number>) => {
            state.page = action.payload;
        },
    },
});
```

Now we can finish setting this up as the `RootState` to use in the components.

```typescript
export const {
    setAmount,
    setRate,
    setTerm,
    setMonthlyPayment,
    setTotalInterest,
    setTotalCost,
    setRequest,
    setResponse,
    setPayments,
    setPage} = loanSlice.actions;

const rootReducer = combineReducers({
    loan: loanSlice.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export const store = configureStore({
    reducer: rootReducer,
    devTools: process.env.NODE_ENV !== 'production',
});
```

### Using state in the components

When we just want to read a piece of state in a component, all we need to do now is make it a const
at the beginning of the component that reads from `RootState` for the property. Here is an example
from the PaymentTable that needs two pieces of state to read, `payments` and `pageNumber`. We'll do this
using the <a href="https://react-redux.js.org/api/hooks#useselector" target="_blank" rel="noreferrer">useSelector</a> method.

```typescript
const PaymentTable = () => {
    const payments = useSelector((state: RootState) => state.loan.payments);
    const pageNumber = useSelector((state: RootState) => state.loan.page);
    
    // ... the rest of the component code
}
```

*Setting* state will be done with <a href="https://react-redux.js.org/api/hooks#usedispatch" target="_blank" rel="noreferrer">useDispatch</a>.
In this app only one component really sets state, and that is the `LoanForm` which is done like the example below. Note that any time we are setting
a new piece of state it is wrapped in `dispatch()`, for example in the method that sets the state for a loan response from the server.

```typescript
const dispatch = useDispatch();

// ... other code

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const loanRequest: LoanRequest = {
        amount: amount,
        rate: rate,
        term: term * 12,
    };

    try {
        const response = await axios.post<LoanResponse>('https://loanshark-api.azurewebsites.net/api/loans', loanRequest);
        dispatch(setResponse(response.data));
        dispatch(setPayments(response.data.payments));
        dispatch(setMonthlyPayment(response.data.monthlyPayment));
        dispatch(setTotalInterest(response.data.totalInterest));
        dispatch(setTotalCost(response.data.totalCost));
        dispatch(setPage(1));
    } catch (error) {
        console.error(error);
    }
};

// ... other code

```

Here is the full code for `loanStore` now that you have a little more context on what it is for and how it is used in Loan Shark.

```typescript
import {combineReducers, configureStore} from '@reduxjs/toolkit';

import {createSlice, PayloadAction} from "@reduxjs/toolkit";

import {LoanRequest} from "../interfaces/LoanRequest";
import {LoanResponse} from "../interfaces/LoanResponse";
import {Payment} from "../interfaces/Payment";

interface LoanState {
    amount: number;
    rate: number;
    term: number;
    monthlyPayment: string | null;
    totalInterest: string | null;
    totalCost: string | null;
    request: LoanRequest | null;
    response: LoanResponse | null;
    payments: Payment[];
    page: number;
}

const initialState: LoanState = {
    amount: 50000.0,
    rate: 5.5,
    term: 2,
    monthlyPayment: null,
    totalInterest: null,
    totalCost: null,
    request: null,
    response: null,
    payments: [],
    page: 1
};

export const loanSlice = createSlice({
    name: 'loan',
    initialState,
    reducers: {
        setAmount: (state, action: PayloadAction<number>) => {
            state.amount = action.payload;
        },
        setRate: (state, action: PayloadAction<number>) => {
            state.rate = action.payload;
        },
        setTerm: (state, action: PayloadAction<number>) => {
            state.term = action.payload;
        },
        setMonthlyPayment: (state, action: PayloadAction<string>) => {
            state.monthlyPayment = action.payload;
        },
        setTotalInterest: (state, action: PayloadAction<string>) => {
            state.totalInterest = action.payload;
        },
        setTotalCost: (state, action: PayloadAction<string>) => {
            state.totalCost = action.payload;
        },
        setRequest: (state, action: PayloadAction<LoanRequest | null>) => {
            state.request = action.payload;
        },
        setResponse: (state, action: PayloadAction<LoanResponse | null>) => {
            state.response = action.payload;
        },
        setPayments: (state, action: PayloadAction<Payment[] | []>) => {
            state.payments = action.payload;
        },
        setPage: (state, action: PayloadAction<number>) => {
            state.page = action.payload;
        },
    },
});

export const {
    setAmount,
    setRate,
    setTerm,
    setMonthlyPayment,
    setTotalInterest,
    setTotalCost,
    setRequest,
    setResponse,
    setPayments,
    setPage} = loanSlice.actions;

const rootReducer = combineReducers({
    loan: loanSlice.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export const store = configureStore({
    reducer: rootReducer,
    devTools: process.env.NODE_ENV !== 'production',
});
```

### Paginating results

In a previous version of this app that I wrote in .NET 7 with Vue.js my wife pointed out the obvious
to me that it is a bad user experience to see 360 rows of data for something like a 30-year mortgage.
She works with financial data for a living, and I value that helpful feedback from someone who looks
at numbers all day. 

After having a think about it, the most useful amount of data per page for something like a loan calculator
is to have each page represent one year worth of payments, or twelve rows. 

If there is nothing in `payments`, then it is just an empty array which will cause the component to not render
as it is checking for the length of the `payments` array to show something.

If there is something in `payments`, the helper function `chunkArray` will handle grabbing a section that from the 
`payments` array that represents the rows for that page. For example on page 2, the elements we want back to display
on the table would be elements 12 through 23 (displayed as rows 13 through 24).

```typescript
const getPaginatedPayments = () => {
    if (!payments) {
        return [];
    }
    return chunkArray(payments!, 12)[pageNumber - 1] || [];
};


const chunkArray = (array: Payment[], size: number) => {
    const pages = [];
    for (let i = 0; i < array.length; i += size) {
        pages.push(array.slice(i, i + size));
    }
    return pages;
};
```

In the `return` portion of `PaymentTable` the rows are displayed by first determining if there are any payments in the
`payments` array, and if there are we can call `getPaginatedPayments()` to grab the 12 payments that should appear in the
table rows for this page/year.

```typescript jsx
return (
    <>
        {payments.length > 0 && (
            <div className="table-outer">
                <div className="table-inner">
                    <table>
                        <thead>
                        <tr>
                            <th>Month</th>
                            <th>Payment</th>
                            <th>Interest</th>
                            <th>Principal</th>
                            <th>Balance</th>
                        </tr>
                        </thead>
                        <tbody>
                        {getPaginatedPayments().map((payment: Payment) => (
                            <tr key={payment.month} className={payment.month % 2 === 0 ? 'bg-slate-200' : ''}>
                                <td>{payment.month}</td>
                                <td>{payment.payment}</td>
                                <td>{payment.interest}</td>
                                <td>{payment.principal}</td>
                                <td>{payment.balance}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </>
);
```

### Handling slower responses during cold start

As I mentioned earlier one of the issues to address with this decoupled architecture is that there will be a delayed response
from the Azure Function every time there has been enough inactivity that a cold start is required on the next `POST` to the endpoint.

Delaying the response until the promise completes only works when there is actually a cold start that needs to happen. That
would show a modal overlay just long enough to let the user know that something is happening and then the data is populated.

The problem with that approach is that when the Azure Function is warmed up the response is very fast, causing the modal to be a
black flicker that is very unpleasant and makes for a bad user experience.

The solution I decided to try is to show a modal for about `750ms` no matter what the state of the Azure Function is, warmed or cold.
I'm not 100% sold on this approach yet, it makes the app feel slower than it actually is but a user that doesn't know the details
may not notice or care that much about waiting 3/4 of a second for data.

The component that handles sending the request is `LoanForm`, so we'll put all that logic in the `handleSubmit` function.

```typescript
const LoanForm = () => {
    // ... other code
    const [isFetching, setIsFetching] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        setIsFetching(true);

        const loanRequest: LoanRequest = {
            amount: amount,
            rate: rate,
            term: term * 12,
        };

        try {
            const response = await axios.post<LoanResponse>('https://loanshark-api.azurewebsites.net/api/loans', loanRequest);

            setTimeout(() => {
                dispatch(setResponse(response.data));
                dispatch(setPayments(response.data.payments));
                dispatch(setMonthlyPayment(response.data.monthlyPayment));
                dispatch(setTotalInterest(response.data.totalInterest));
                dispatch(setTotalCost(response.data.totalCost));
                dispatch(setPage(1));
                setIsFetching(false);
            }, 750);

        } catch (error) {
            console.error(error);
            setIsFetching(false);
        }
    };
    
    // ... other code
}
```

In the return body of `LoanForm` at the beginning we'll do a conditional render of `FetchingModal` if the `isFetching` is `true`.

```typescript jsx
return (
    <div>
        {isFetching && (
            <FetchingModal/>
        )}
        <form onSubmit={handleSubmit}>
            {/*Form code here*/}
        </form>
    </div>
);
```

The modal itself is just a div with an `svg` and a `span`.

```typescript jsx
const FetchingModal = () => {
    return (
        <div
            className="fixed z-10 top-0 left-0 w-full h-full flex justify-center items-center bg-gray-900 bg-opacity-90">
            <svg className="animate-spin h-10 w-10 text-white mr-3" xmlns="http://www.w3.org/2000/svg"
                 width="32" height="32" viewBox="0 0 24 24">
                {/*The SVG path stuff for a spinner goes here */}
            </svg>
            <span className="text-white text-xl">Calculating your loan...</span>
        </div>
    );
}
```


### Deploying the React App to Azure

For the Front End I deployed the app to an <a href="https://learn.microsoft.com/en-us/azure/static-web-apps/overview" target="_blank" rel="noreferrer">Azure Static Web App</a> using the Azure Portal. 
This is a very straight forward process and allows you to point to a GitHub repo during creation that will add a new <a href="https://docs.github.com/en/actions" target="_blank" rel="noreferrer">GitHub Action</a> to 
deploy changes and update the app on commit to your chosen branch, e.g. main.

If you wanted to deploy from the Azure CLI, that is also pretty straight forward and would use a command like the following taken directly from the <a href="https://learn.microsoft.com/en-us/azure/static-web-apps/get-started-cli?tabs=react" target="_blank" rel="noreferrer">Microsoft documentation</a>.

```bash
az staticwebapp create \
    --name my-first-static-web-app \
    --resource-group my-swa-group \
    --source https://github.com/$GITHUB_USER_NAME/my-first-static-web-app \
    --location "eastus2" \
    --branch main \
    --app-location "/"  \
    --output-location "build"  \
    --login-with-github
```

Please feel free to have a look at the full source code for the Front End on <a href="https://github.com/jgnovakdev/loanshark" target="_blank" rel="noreferrer">GitHub</a>.


## Wrapping up

That concludes this article on Creating Loan Shark. I hope you enjoyed reading it and maybe you either learned
something new or something written here or shared in the source code gave you an idea for one of your own projects.

To view the live app deployed to Azure, click on the screenshot below to open it in a new tab.

<a href="https://loanshark.jgnovak.net" target="_blank" rel="noreferrer" class="">
<img class="w-[50%]" src="https://jgnportfoliostorage.blob.core.windows.net/portfolio/loanshark-screenshot.png" />
</a>

-JGN