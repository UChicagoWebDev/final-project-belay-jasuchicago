// Constants to represent different pages
const PAGES = {
    HOME: document.querySelector(".splash"),
    PROFILE: document.querySelector(".profile"),
    LOGIN: document.querySelector(".login"),
    CHANNELS: document.querySelector(".channels"),
    THREADS: document.querySelector(".threads")
};

// Event listeners to initialize navigation and load appropriate content on page load
window.addEventListener("DOMContentLoaded", initializePage);
window.addEventListener("popstate", handlePopState);

// Initialize the page
function initializePage() {
    initializeNavigation();
    initializeSessionStorage();
    navigateTo(window.location.pathname);
}

// Function to handle popstate event
function handlePopState() {
    window.history.go(-(window.history.length - 1));
    navigateTo(window.location.pathname);
}

// Function to navigate to a specific path
function navigateTo(path) {
    console.log("Navigating to", path);
    history.pushState({}, "", path);
    handleAuthentication(path);
}

// Function to handle user authentication and redirection
function handleAuthentication(path) {
    const userApiKey = sessionStorage.getItem("userApiKey");
    const loggedIn = userApiKey !== null;

    if (loggedIn && (path === "/" || path === "/login")) {
        navigateTo("/channels");
    } else if (!loggedIn && path !== "/login") {
        navigateTo("/login");
    } else {
        routeToPage(path);
    }
}

// Function to initialize session storage
function initializeSessionStorage() {
    sessionStorage.setItem("message_id", "0");
    sessionStorage.setItem("channel_name", "");
    sessionStorage.setItem("channel_id", "0");
}

// Function to handle user signup
function signup() {
    fetch('/api/', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        const userApiKey = data[0].user_api;
        sessionStorage.setItem("userApiKey", userApiKey);
        navigateTo("/profile");
    })
    .catch(error => console.error('Error signing up:', error));
}

// Function to handle user login
function login() {
    const username = document.querySelector("#login-username").value;
    const password = document.querySelector("#login-pw").value;
    fetch('/api/login', {
        method: 'POST',
        headers: {
            'username': username,
            'password': password
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Invalid credentials');
    })
    .then(data => {
        const userApiKey = data.user_api_key;
        sessionStorage.setItem("userApiKey", userApiKey);
        navigateTo("/profile");
    })
    .catch(error => console.error('Error logging in:', error));
}

// Function to initialize event listeners on page load
function initializeNavigation() {
    console.log("Event listeners loaded");
    const loginButton = document.querySelector(".login-button");
    loginButton.addEventListener("click", () => navigateTo("/login"));
    // Add other event listeners...
}

// Function to route to the appropriate page based on the path
function routeToPage(path) {
    const pathList = path.split("/");
    switch (pathList[1]) {
        case "":
            showOnly(PAGES.HOME);
            break;
        case "login":
            resetLoginFields();
            showOnly(PAGES.LOGIN);
            break;
        case "profile":
            updateProfileFields();
            showOnly(PAGES.PROFILE);
            break;
        case "channels":
        case "threads":
            resetMessageId();
            updateUsernameDisplay();
            showOnly(pathList[1].toUpperCase());
            pollForContent(pathList[1]);
            break;
        default:
            console.log("404");
    }
}

// Function to show only the specified element and hide others
function showOnly(element) {
    const pages = Object.values(PAGES);
    pages.forEach(page => page.classList.add("hide"));
    element.classList.remove("hide");
}

// Function to update the profile fields with user information
function updateProfileFields() {
    const username = sessionStorage.getItem("user_name");
    document.querySelector("#profile-username").textContent = username;
    clearInputFields("#name-set", "#pw-set");
}

// Function to reset login fields when navigating to the login page
function resetLoginFields() {
    clearInputFields("#login-username", "#login-pw");
    hideMessage(".message");
}

// Function to reset the message ID to 0
function resetMessageId() {
    sessionStorage.setItem("message_id", "0");
}

// Function to update the profile fields with user information
function updateProfileFields() {
    const username = sessionStorage.getItem("user_name");
    document.querySelector("#profile-username").textContent = username;
    clearInputFields("#name-set", "#pw-set");
}

// Function to update the display with the current username
function updateUsernameDisplay() {
    const username = sessionStorage.getItem("user_name");
    document.querySelector("#two-username").textContent = username;
    document.querySelector("#three-username").textContent = username;
}

// Fetches and displays channels or threads based on the provided URL
function buildChannelsOrThreads(url) {
    const fetchUrl = url === "channels" ? "/api/channels" : "/api/threads";
    const blockSelector = url === "channels" ? "#channels-2col" : "#channels-3col";

    fetchAndDisplay(fetchUrl, blockSelector, "list-channels");
}

// Fetches data and displays it in the target element
function fetchAndDisplay(url, targetElementId, messageType) {
    fetch(`/api/${url}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "user-id": sessionStorage.getItem("user_id"),
            "get-type": messageType,
            "current-channel": sessionStorage.getItem("channel_id")
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        return response.json();
    })
    .then(info => {
        const block = document.querySelector(targetElementId);
        block.innerHTML = "";

        if (info[0] === "no channels") {
            return;
        } else {
            info.forEach(item => {
                const element = createChannelElement(item, url);
                block.appendChild(element);
            });
        }
    })
    .catch(error => {
        console.error(`Error fetching ${url}:`, error);
        const errorBlock = document.createElement("p");
        errorBlock.textContent = `An error occurred while fetching ${url}. Please try again later.`;
        const block = document.querySelector(targetElementId);
        block.innerHTML = "";
        block.appendChild(errorBlock);
    });
}

// Creates a channel element
function createChannelElement(channelData, page) {
    const channelName = channelData.channel_name;
    const channelId = channelData.channel_id;

    const div = document.createElement("div");
    if (channelId === sessionStorage.getItem("channel_id")) {
        div.setAttribute("id", "selected");
    }
    div.addEventListener("click", () => {
        sessionStorage.setItem("channel_id", channelId);
        sessionStorage.setItem("channel_name", channelName);
        if (page === "two") {
            sessionStorage.setItem("message_id", 0);
            document.querySelector(".post1").classList.remove("hide");
        } else if (page === "three") {
            document.querySelector(".post2").classList.remove("hide");
        }
    });
    div.classList.add("channel-option");
    div.setAttribute("number", channelId);

    const name = document.createElement("name");
    name.innerHTML = channelName;
    const space = document.createElement("br");

    div.appendChild(name);
    div.appendChild(space);

    return div;
}

// Creates a new channel
function createNewChannel(channelName, page) {
    const apiUrl = page === "two" ? "/api/channels" : "/api/threads";
    fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "new-name": channelName,
            "post-type": "channel"
        },
    })
        .then(response => {
            if (response.status === 200) {
                console.log("Your channel has been saved");
            } else {
                console.log("Not valid");
            }
        })
        .catch(error => {
            console.error("Error creating channel:", error);
        });
}

// Fetches data and displays it in the target element
function fetchDataAndDisplay(url, targetElementId, messageType) {
    fetch(`/api/${url}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "channel-id": sessionStorage.getItem("channel_id"),
            "get-type": messageType
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            const targetElement = document.getElementById(targetElementId);
            targetElement.innerHTML = ""; // Clear previous content
            displayData(data, targetElement, messageType);
        })
        .catch(error => {
            console.error(`Error fetching ${messageType}:`, error);
            const errorMessage = document.createElement("p");
            errorMessage.textContent = `An error occurred while fetching ${messageType}. Please try again later.`;
            const targetElement = document.getElementById(targetElementId);
            targetElement.innerHTML = ""; // Clear previous content
            targetElement.appendChild(errorMessage);
        });
}


// Displays fetched data in the target element
function displayData(data, targetElement, messageType) {
    if (data.length > 0) {
        data.forEach(dataItem => {
            const messageElement = createMessageElement(dataItem);
            targetElement.appendChild(messageElement);
        });
    } else {
        const noDataMessage = document.createElement("p");
        noDataMessage.textContent = `No ${messageType} available.`;
        targetElement.appendChild(noDataMessage);
    }
}

// Function to post content (message or reply)
function postContent(url, textBoxId, messageType) {
    const content = document.querySelector(textBoxId).value;

    fetch(`/api/${url}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "channel-id": sessionStorage.getItem("channel_id"),
            "user-id": sessionStorage.getItem("user_id"),
            "post-type": messageType
        },
        body: JSON.stringify(content)
    })
    .then(response => {
        if (response.ok) {
            console.log(`${messageType} posted successfully`);
        } else {
            console.log("Something went wrong");
        }
    })
    .catch(error => {
        console.error(`Error posting ${messageType}:`, error);
    });
}

// Function to add a reaction to a message
function addReaction(emoji, message_id, user_id) {
    const apiPath = `/api/${window.location.pathname.split('/')[1]}`;

    fetch(apiPath, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "emoji": emoji,
            "message-id": message_id,
            "user-id": user_id,
            "post-type": "reaction"
        }
    })
    .then(response => {
        if (response.ok) {
            console.log("Reaction added successfully");
        } else {
            console.log("Something went wrong");
        }
    })
    .catch(error => {
        console.error("Error adding reaction:", error);
    });
}

// Fetches and displays header messages
function headerMessage() {
    fetch(/api/threads, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "channel-id": sessionStorage.getItem("channel_id"),
            "chat-id": sessionStorage.getItem("message_id"),
            "get-type": "header_message"
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(info => {
            const messagesBlock = document.getElementById("header-three");
            messagesBlock.innerHTML = "";
            if (info.length > 0) {
                info.forEach(message => {
                    const messageElement = createMessageElement(message);
                    messagesBlock.appendChild(messageElement);
                });
            } else {
                const noMessagesMessage = document.createElement("p");
                noMessagesMessage.textContent = "No header messages available.";
                messagesBlock.appendChild(noMessagesMessage);
            }
        })
        .catch(error => {
            console.error('Error fetching header messages:', error);
            const errorBlock = document.createElement("p");
            errorBlock.textContent = "An error occurred while fetching header messages. Please try again later.";
            const messagesBlock = document.getElementById("header-three");
            messagesBlock.innerHTML = "";
            messagesBlock.appendChild(errorBlock);
        });
}

// Helper function to create a message element
function createMessageElement(messageData) {
    const newMessage = document.createElement("div");
    const newAuthor = document.createElement("author");
    const newContent = document.createElement("content");
    const newImg = document.createElement("img");
    const reactionButtons = createReactionButtons(messageData);

    newMessage.appendChild(newAuthor);
    newMessage.appendChild(newContent);
    newMessage.appendChild(newImg);
    newMessage.append(...reactionButtons);

    newImg.setAttribute("src", messageData.img_src);
    newContent.textContent = messageData.body;
    newAuthor.textContent = messageData.author;

    return newMessage;
}

// Helper function to create reaction buttons for a message
function createReactionButtons(messageData) {
    const reactionButtons = [];
    const reactions = [
        { type: "hearts", emoji: String.fromCodePoint(0x2764), count: messageData.hearts },
        { type: "thumbsup", emoji: String.fromCodePoint(0x1F44D), count: messageData.thumbsup },
        { type: "happyface", emoji: String.fromCodePoint(0x1F600), count: messageData.happyface },
        { type: "laughing", emoji: String.fromCodePoint(0x1F602), count: messageData.laughing },
        { type: "star", emoji: String.fromCodePoint(0x2B50), count: messageData.star },
        { type: "thumbsdown", emoji: String.fromCodePoint(0x1F44E), count: messageData.thumbsdown }
    ];

    reactions.forEach(reaction => {
        const button = document.createElement("button");
        button.textContent = `${reaction.count} ${reaction.emoji}`;
        button.classList.add("reaction");
        button.addEventListener("click", (event) => {
            event.preventDefault();
            addReaction(reaction.type, messageData.message_id, sessionStorage.getItem("user_id"));
        });
        reactionButtons.push(button);
    });

    return reactionButtons;
}

// Function to continuously poll for channels and update the UI
function pollForContent() {
    const intervalId = setInterval(() => {
        const path = window.location.pathname.split('/')[1];
        if (path === "channels" || path === "threads") {
            buildChannels(path);
        } else {
            clearInterval(intervalId);
        }
    }, 1000);
}

// Function to continuously poll for messages and update the UI
function pollForMessages() {
    const intervalId = setInterval(() => {
        const path = window.location.pathname.split('/')[1];
        if (path === "channels" || path === "threads") {
            const channelId = sessionStorage.getItem("channel_id");
            if (channelId !== "0") {
                updateChannelName();
                buildMessages(path);
                if (path === "threads") {
                    headerMessage();
                    buildReplies();
                }
            }
        } else {
            clearInterval(intervalId);
        }
    }, 500);
}

// Helper function to update the displayed channel name
function updateChannelName() {
    const channelName = sessionStorage.getItem("channel_name");
    document.querySelector("#name-2col").innerHTML = channelName;
    document.querySelector("#name-3col").innerHTML = channelName;
}

// Helper function to clear input fields
function clearInputFields(...selectors) {
    selectors.forEach(selector => document.querySelector(selector).value = "");
}

// Helper function to hide a message element
function hideMessage(selector) {
    document.querySelector(selector).classList.add("hide");
}


// Call necessary functions on page load
initializePage();