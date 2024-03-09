// Constants to easily refer to pages
const HOME = document.querySelector(".splash");
const PROFILE = document.querySelector(".profile");
const LOGIN = document.querySelector(".login");
const CHANNELS = document.querySelector(".channels");
const THREADS = document.querySelector(".threads");

// Function to show only the specified element and hide others
function showOnly(element) {
    const pages = [HOME, LOGIN, PROFILE, CHANNELS, THREADS];
    pages.forEach(page => page.classList.add("hide"));
    element.classList.remove("hide");
}

// Function to handle navigation based on URL path
function navigateTo(path) {
    console.log("Navigating to:", path);
    history.pushState({}, "", path);
    const loggedIn = sessionStorage.getItem("user_auth_key") !== null;
    if (loggedIn && (path === "/" || path === "/login")) {
        path = "/channels";
    } else if (!loggedIn && path !== "/") {
        path = "/login";
    } else if (sessionStorage.getItem("message_id") === "0" && path === "/threads") {
        path = "/channels";
    }
    router(path);
}

// Router function to display the appropriate page based on the URL path
function router(path) {
    const pathList = path.split("/");
    switch (pathList[1]) {
        case "":
            showOnly(HOME);
            break;
        case "login":
            document.querySelector(".message").classList.add("hide");
            document.querySelector("#login-username").value = "";
            document.querySelector("#login-pw").value = "";
            showOnly(LOGIN);
            break;
        case "profile":
            document.querySelector("#profile-username").textContent = sessionStorage.getItem("user_name");
            document.querySelector("#name-set").value = "";
            document.querySelector("#pw-set").value = "";
            showOnly(PROFILE);
            break;
        case "channels":
            sessionStorage.setItem("message_id", "0");
            document.querySelector("#two-username").textContent = sessionStorage.getItem("user_name");
            showOnly(CHANNELS);
            pollForChannels();
            pollForMessages();
            break;
        case "threads":
            document.querySelector("#three-username").textContent = sessionStorage.getItem("user_name");
            showOnly(THREADS);
            pollForChannels();
            pollForMessages();
            break;
        default:
            console.log("404: Page not found");
    }
}

// Function to load event listeners
function loadEventListeners() {
    // Event listeners for "/" page
    document.querySelector(".login-button").addEventListener("click", () => navigateTo("/login"));
    document.querySelector(".signup").addEventListener("click", homeSignUp);

    // Event listeners for "channels" page
    document.querySelector("#profile-button1").addEventListener("click", () => navigateTo("/profile"));
    document.querySelector("#create-channel1").addEventListener("click", () => {
        document.querySelector("#un-hide1").classList.remove("hide");
    });
    document.querySelector("#hit-enter1").addEventListener("click", createNewChannel);
    document.querySelector("#post-button1").addEventListener("click", () => {
        postMessage("/channels");
        document.querySelector("#post-box1").value = "";
    });

    // Event listeners for "threads" page
    document.querySelector("#profile-button2").addEventListener("click", () => navigateTo("/profile"));
    document.querySelector("#create-channel2").addEventListener("click", () => {
        document.querySelector("#un-hide2").classList.remove("hide");
    });
    document.querySelector("#hit-enter2").addEventListener("click", createNewChannel);
    document.querySelector("#exit-threads").addEventListener("click", () => {
        sessionStorage.setItem("message_id", "0");
        navigateTo("/channels");
    });
    document.querySelector("#post-button2").addEventListener("click", () => {
        postMessage("/threads");
        document.querySelector("#post-box2").value = "";
    });
    document.querySelector("#reply-button").addEventListener("click", () => {
        postReply("/threads");
        document.querySelector("#reply-box").value = "";
    });

    // Event listeners for "profile" page
    document.querySelector("#log-out").addEventListener("click", () => {
        sessionStorage.clear();
        navigateTo("/");
    });
    document.querySelector("#go-back").addEventListener("click", () => {
        document.querySelector("#pw-set").value = "";
        document.querySelector("#name-set").value = "";
        history.back();
    });
    document.querySelector("#updateUser").addEventListener("click", updateUsername);
    document.querySelector("#updatePassword").addEventListener("click", updatePassword);

    // Event listeners for "login" page
    document.querySelector(".go-button").addEventListener("click", logIn);
    document.querySelector(".new").addEventListener("click", loginSignUp);
}

// Function to update username
function updateUsername(event) {
    event.preventDefault();
    const newUsername = document.querySelector("#name-set").value;
    fetchProfile("username", newUsername);
}

// Function to update password
function updatePassword(event) {
    event.preventDefault();
    const newPassword = document.querySelector("#pw-set").value;
    fetchProfile("password", newPassword);
}

// Function to handle login
function logIn(event) {
    event.preventDefault();
    const username = document.querySelector("#login-username").value;
    const password = document.querySelector("#login-pw").value;
    fetch(`/api/login?username=${username}&password=${password}`)
        .then(response => response.json())
        .then(info => {
            if (info.length > 0 && info[0].user_api_key !== null) {
                const { user_id, user_api_key, user_name } = info[0];
                sessionStorage.setItem("user_auth_key", user_api_key);
                sessionStorage.setItem("user_id", user_id);
                sessionStorage.setItem("user_name", user_name);
                history.back();
            } else {
                document.querySelector(".message").classList.remove("hide");
            }
        });
}

// Function to handle signup from home
function homeSignUp(event) {
    event.preventDefault();
    fetch(`/api/`, { method: "POST", headers: { "Content-Type": "application/json" } })
        .then(response => response.json())
        .then(info => {
            const { user_api, user_name, user_id } = info[0];
            sessionStorage.setItem("user_auth_key", user_api);
            sessionStorage.setItem("user_name", user_name);
            sessionStorage.setItem("user_id", user_id);
            navigateTo("/channels");
        });
}

// Function to handle signup from login page
function loginSignUp(event) {
    event.preventDefault();
    fetch(`/api/login`, { method: "POST", headers: { "Content-Type": "application/json" } })
        .then(response => response.json())
        .then(info => {
            const { user_api, user_name, user_id } = info[0];
            sessionStorage.setItem("user_auth_key", user_api);
            sessionStorage.setItem("user_name", user_name);
            sessionStorage.setItem("user_id", user_id);
            navigateTo("/channels");
        });
}

// Function to fetch profile updates
function fetchProfile(updateType, value) {
    const headers = {
        "Content-Type": "application/json",
        "auth-key": sessionStorage.getItem("user_auth_key"),
        "update-type": updateType
    };

    if (updateType === "username") {
        headers["username"] = value;
    } else if (updateType === "password") {
        headers["new-pw"] = value;
    }

    fetch(`/api/profile`, {
        method: "POST",
        headers: headers
    })
    .then(response => {
        if (response.status === 200) {
            console.log(updateType === "username" ? "Your username has been updated" : "Your password has been updated");
            if (updateType === "username") {
                sessionStorage.setItem("user_name", value);
                document.querySelector("#profile-username").textContent = value;
            }
        } else {
            console.log("Failed to update profile");
        }
    })
    .catch(error => {
        console.error("Error updating profile:", error);
    });
}


// Function to create a new channel
function createNewChannel(event) {
    event.preventDefault();
    const channelName = document.querySelector("#channel-set" + (event.currentTarget.id === "hit-enter1" ? "1" : "2")).value;
    fetch(/api/channels, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "auth-key": sessionStorage.getItem("user_auth_key"),
            "channel-name": channelName
        }
    })
        .then(response => {
            if (response.status === 200) {
                console.log("New channel created:", channelName);
            } else {
                console.log("Failed to create channel");
            }
        });
}

// Function to post a message
function postMessage(path) {
    const messageBox = document.querySelector("#post-box" + (path === "/channels" ? "1" : "2"));
    const message = messageBox.value.trim();
    if (message) {
        fetch(`/api${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "auth-key": sessionStorage.getItem("user_auth_key"),
                "channel-id": sessionStorage.getItem("channel_id"),
            },
            body: JSON.stringify({
                "message": message
            })
        })
        .then(response => {
            if (response.status === 200) {
                console.log("Message posted:", message);
            } else {
                console.log("Failed to post message");
            }
        });
    }
}

// Function to post a reply
function postReply(path) {
    const replyBox = document.querySelector("#reply-box");
    const reply = replyBox.value.trim();
    if (reply) {
        fetch(`/api${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "auth-key": sessionStorage.getItem("user_auth_key"),
                "message-id": sessionStorage.getItem("message_id"),
            },
            body: JSON.stringify({
                "reply": reply
            })
        })
        .then(response => {
            if (response.status === 200) {
                console.log("Reply posted:", reply);
            } else {
                console.log("Failed to post reply");
            }
        });
    }
}

// Function to load event listeners on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
    loadEventListeners();
    sessionStorage.setItem("message_id", "0");
    sessionStorage.setItem("channel_name", "");
    sessionStorage.setItem("channel_id", "0");
    navigateTo(window.location.pathname);
});

// Event listener for popstate events
window.addEventListener("popstate", () => {
    window.history.go(-(window.history.length - 1));
    console.log("Popstate: delete history");
    navigateTo(window.location.pathname);
});

// Function to fetch data from the server
async function fetchData(endpoint, method = "GET", headers = {}, body = null) {
    try {
        const response = await fetch(`/api/${endpoint}`, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "auth-key": sessionStorage.getItem("user_auth_key"),
                ...headers
            },
            body: body ? JSON.stringify(body) : null
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch data. Status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error; // Propagate the error to the caller
    }
}

// Function to build the list of channels
function buildChannels(url) {
    const endpoint = (url === "channels") ? "channels" : "threads";
    fetchData(endpoint, "GET", { "user-id": sessionStorage.getItem("user_id"), "get-type": "list-channels", "current-channel": sessionStorage.getItem("channel_id") })
        .then(info => {
            const block = document.querySelector(url === "channels" ? "#channels-2col" : "#channels-3col");
            block.innerHTML = "";
            if (info.length > 0) {
                info.forEach(item => {
                    const channelName = item.channel_name;
                    const channelId = item.channel_id;

                    const div = document.createElement("div");
                    div.classList.add("channel-option");
                    div.setAttribute("number", channelId);
                    div.addEventListener("click", (event) => {
                        event.preventDefault();
                        sessionStorage.setItem("channel_id", channelId);
                        sessionStorage.setItem("channel_name", channelName);
                        if (url === "channels") {
                            document.querySelector(".post1").classList.remove("hide");
                        } else {
                            document.querySelector(".post2").classList.remove("hide");
                        }
                    });

                    const name = document.createElement("name");
                    name.innerHTML = channelName;
                    const space = document.createElement("br");

                    div.appendChild(name);
                    div.appendChild(space);
                    block.appendChild(div);
                });
            }
        })
        .catch(error => console.error("Failed to build channels:", error));
}

// Function to create a new channel
function createNewChannel(channelName, page) {
    const endpoint = (page === "two") ? "channels" : "threads";
    fetchData(endpoint, "POST", { "new-name": channelName, "post-type": "channel" })
        .then(response => {
            if (response.status === 200) {
                console.log("Your channel has been saved");
            } else {
                console.log("Not valid");
            }
        })
        .catch(error => console.error("Failed to create new channel:", error));
}

// Function to build messages
function buildMessages(url) {
    const endpoint = (url === "channels") ? "channels" : "threads";
    
    fetchData(endpoint, "GET", { 
        "channel-id": sessionStorage.getItem("channel_id"), 
        "get-type": "list-messages" 
    }).then(messages => {
        const messagesBlock = document.getElementById(url === "channels" ? "messages-2col" : "messages-3col");
        messagesBlock.innerHTML = "";
        
        if (messages.length > 0) {
            messages.forEach(messageData => {
                const newMessage = createMessageElement(messageData);
                messagesBlock.appendChild(newMessage);
            });
        } else {
            // Handle case when there are no messages to display
            const noMessagesMessage = document.createElement("p");
            noMessagesMessage.textContent = "No messages to display.";
            messagesBlock.appendChild(noMessagesMessage);
        }
    }).catch(error => {
        console.error("Failed to build messages:", error);
    });
}

// Function to create message element
function createMessageElement(messageData) {
    const newMessage = document.createElement("message");
    const newAuthor = document.createElement("author");
    const newContent = document.createElement("content");
    const newImg = document.createElement("img");
    const buttons = createReactionButtons(messageData);

    newMessage.appendChild(newAuthor);
    newMessage.appendChild(newContent);
    newMessage.appendChild(newImg);
    buttons.forEach(button => newMessage.appendChild(button));

    newMessage.appendChild(document.createElement("hr"));

    newMessage.setAttribute("message_id", messageData.message_id);
    newImg.setAttribute("src", messageData.img_src);
    newContent.textContent = messageData.body;
    newAuthor.textContent = messageData.author;

    return newMessage;
}

// Function to create reaction buttons
function createReactionButtons(messageData) {
    const buttons = [];

    buttons.push(createReactionButton(messageData.hearts, "hearts"));
    buttons.push(createReactionButton(messageData.thumbsup, "thumbsup"));
    buttons.push(createReactionButton(messageData.happyface, "happyface"));
    buttons.push(createReactionButton(messageData.laughing, "laughing"));
    buttons.push(createReactionButton(messageData.star, "star"));
    buttons.push(createReactionButton(messageData.thumbsdown, "thumbsdown"));

    return buttons;
}

// Function to create a reaction button
function createReactionButton(count, reactionType) {
    const button = document.createElement("button");
    button.textContent = count + " " + getEmojiForReaction(reactionType);
    button.classList.add("reaction");
    button.addEventListener("click", () => {
        addReaction(reactionType, messageData.message_id, sessionStorage.getItem("user_id"));
    });
    return button;
}

// Function to get emoji for a reaction
function getEmojiForReaction(reactionType) {
    switch (reactionType) {
        case "hearts":
            return String.fromCodePoint(0x2764);
        case "thumbsup":
            return String.fromCodePoint(0x1F44D);
        case "happyface":
            return String.fromCodePoint(0x1F600);
        case "laughing":
            return String.fromCodePoint(0x1F602);
        case "star":
            return String.fromCodePoint(0x2B50);
        case "thumbsdown":
            return String.fromCodePoint(0x1F44E);
        default:
            return ""; 
    }
}

// Function to post a message
function postMessage(url, message) {
    const endpoint = (url === "/channels") ? "channels" : "threads";
    
    fetchData(endpoint, "POST", { 
        "channel-id": sessionStorage.getItem("channel_id"), 
        "user-id": sessionStorage.getItem("user_id"), 
        "post-type": "message" 
    }, message).then(response => {
        if (response.status === 200) {
            console.log("Post made");
        } else {
            console.log("Something went wrong");
        }
    }).catch(error => {
        console.error("Failed to post message:", error);
    });
}

// Function to post a reply
function postReply(reply) {
    fetchData("threads", "POST", { 
        "channel-id": sessionStorage.getItem("channel_id"), 
        "message-id": sessionStorage.getItem("message_id"), 
        "user-id": sessionStorage.getItem("user_id"), 
        "post-type": "reply" 
    }, reply).then(response => {
        if (response.status === 200) {
            console.log("Reply posted");
        } else {
            console.log("Something went wrong");
        }
    }).catch(error => {
        console.error("Failed to post reply:", error);     
    });
}

// Function to add a reaction
function addReaction(emoji, messageId, userId) {
    const endpoint = (window.location.pathname.split('/')[1] === "channels") ? "channels" : "threads";
    
    fetchData(endpoint, "POST", { 
        "emoji": emoji, 
        "message-id": messageId, 
        "user-id": userId, 
        "post-type": "reaction" 
    }).then(response => {
        if (response.status === 200) {
            console.log("Reaction made");
        } else {
            console.log("Something went wrong");
        }
    }).catch(error => {
        console.error("Failed to add reaction:", error);   
    });
}


// Function to poll for channels
function pollForChannels() {
    const intervalId = setInterval(() => {
        const path = window.location.pathname.split('/')[1];
        if (path === "channels" || path === "threads") {
            buildChannels(path);
        } else {
            clearInterval(intervalId);
        }
    }, 1000);
}

// Function to poll for messages
function pollForMessages() {
    const intervalId = setInterval(() => {
        const path = window.location.pathname.split('/')[1];
        if (path === "channels" || path === "threads") {
            if (sessionStorage.getItem("channel_id") !== "0") {
                const page = (path === "channels") ? "channels" : "threads";
                document.querySelector(`#name-${page === "channels" ? "2col" : "3col"}`).innerHTML = sessionStorage.getItem("channel_name");
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
