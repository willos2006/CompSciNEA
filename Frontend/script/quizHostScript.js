$(document).ready(() => {
    var urlParams = new URLSearchParams(window.location.search);
    const entries = urlParams.entries();
    const params = {};
    for (entry of entries) {
        params[entry[0]] = entry[1];
    }
    var classID = params.classID;
    var quizID = params.quizID;
    
    ws = new WebSocket("ws://localhost:8080");
    ws.onopen = () => {
        $.post("/getUserID", (data) => {
            ws.send(JSON.stringify({type: "init", classID: classID, quizID: quizID, userID: data.userID}));
        });
    }
    ws.onmessage = (message) => {
        message = JSON.parse(message.data);
        if(message.type == "ping"){
            ws.send(JSON.stringify({type: "pong"}));
        }
    }
})