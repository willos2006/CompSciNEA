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
            alert("Host has disconnected. Redirecting to home page");
            window.location = "http://localhost:4000/";
        }
        else if (message.type == "previewQuestion"){
            hideAll();
            $("#previewQuestionText").html(`${message.questionNo}) ${message.question}`);
            $("#previewQuestion").show();
        }
        else if (message.type == "presentQuestion"){
            hideAll();
            let a = message.questionObj.ansA;
            let b = message.questionObj.ansB;
            let c = message.questionObj.ansC;
            let d = message.questionObj.ansD;
            $("#questionText").html(message.questionNo + ") " + message.questionObj.question);
            $("#a").html(a); $("#b").html(b); $("#c").html(c); $("#d").html(d);
            $("#questionScreen").show();
        }
    }
});

function hideAll(){
    $("#entryText").hide();
    $("#previewQuestion").hide();
    $("#questionScreen").hide();
}