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
            $("#0").html(a); $("#1").html(b); $("#2").html(c); $("#3").html(d);
            $("#questionScreen").show();
        }
        else if (message.type == "answerAccepted"){
            hideAll();
            $("#timeTakenText").html(message.timeTaken + "s");
            $("#answerSubmit").show();
        }
        else if (message.type == "resultData"){
            hideAll();
            if (message.result){
                $("#questionResText").html("correct!");
            }
            else{
                $("#questionResText").html("incorrect");
            }
            $("#answerEndScreen").show()
        }
    }

    $(".questionOption").on("click", function () { //using function notation here rather than () => {} so i can access the element clicked with 'this'
        let option = Number($(this).attr("id"));
        ws.send(JSON.stringify({type: "submitQuestion", option: option}));
        hideAll();
        $("#answerSubmit").show();
    });
});

function hideAll(){
    $("#entryText").hide();
    $("#previewQuestion").hide();
    $("#questionScreen").hide();
    $("#answerSubmit").hide();
    $("#answerEndScreen").hide()
}