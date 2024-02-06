$(document).ready(() => {
    var urlParams = new URLSearchParams(window.location.search);
    const entries = urlParams.entries();
    const params = {};
    var ws;
    for (entry of entries) {
        params[entry[0]] = entry[1];
    }
    var gameID = params.gameID;
    var userID;
    var username;
    $.ajaxSetup({async: false});
    $.post("/getUserID", (data) => {
        userID = data.userID
        $.post("/getUsername", (data) => {
            username = data.username;
        });
    });
    ws = new WebSocket("ws://localhost:8080");
    ws.onopen = () => {
        ws.send(JSON.stringify({type: "joinGame", userID: userID, gameID: gameID, username: username}));
    }
    ws.onmessage = (message) => {
        message = JSON.parse(message.data);
        if(message.type == "ping"){
            ws.send(JSON.stringify({type: "pong"}));
        }
        if (message.type == "hostDisconnect"){
            console.log("here");
            alert("Host has disconnected. Redirecting to home page");
            window.location = "http://localhost:4000/";
        }
        else if (message.type == "previewQuestion"){
            console.log("recieved")
            hideAll();
            $("#previewQuestionText").html(`${message.questionNo}) ${message.question}`);
            $("#previewQuestion").show();
        }
    }
});

function hideAll(){
    $("#entryText").hide();
    $("#previewQuestion").hide();
}