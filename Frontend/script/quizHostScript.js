$(document).ready(() => {
    var state = 0;
    /*
    STATES:
    0 - WAITING FOR USERS TO JOIN
    1 - WAITING FOR ANSWERS
    2 - IDLE (E.G. POST-QUESTION)
     */

    var urlParams = new URLSearchParams(window.location.search);
    const entries = urlParams.entries();
    const params = {};
    for (entry of entries) {
        params[entry[0]] = entry[1];
    }
    var classID = params.classID;
    var quizID = params.quizID;

    $.post("/getQuizNameByID", {quizID: quizID}, (data) => {
        $("#quizName").html(data.quizName);
    });

    $.post("/getClassNameByID", {classID: classID}, (data) => {
        $("#className").html(data.className);
    });

    $("#startGameBtn").on("click", () => {
        ws.send(JSON.stringify({type: "nextQuestion"}));
    });

    $("#submitBtn").on("click", () => {
        /* submit code */
    });
    
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
        else if (message.type == "userJoin" && state == 0){
            $("#playerList").append(`<li class="playerEntry" id=${message.userID}>${message.username}</li>`);
        }
        else if (message.type == "userLeave" && state == 0){
            $(`#${message.userID}`).remove();
        }
        else if (message.type == "previewQuestion"){
            hideAll();
            $("#questionPreviewText").html(message.questionNo + ") " + message.question);
            $("#questionPreview").show();
        }
        else if (message.type == "presentQuestion"){
            hideAll();
            $("#questionAnsweredText").html(`0 / ${message.totalUsers}`);
            let a = message.questionObj.ansA;
            let b = message.questionObj.ansB;
            let c = message.questionObj.ansC;
            let d = message.questionObj.ansD;
            $("#questionText").html(message.questionNo + ") " + message.questionObj.question);
            $("#0").html(a); $("#1").html(b); $("#2").html(c); $("#3").html(d);
            $("#questionScreen").show();
        }
        else if (message.type == "answerUpdate"){
            $("#questionAnsweredText").html(`${message.totalAnswered} / ${message.totalUsers}`);
        }
        else if (message.type == "resultData"){
            hideAll();
            $("#correctAns").html(message.correctAnswer);
            $("#totalCorrectText").html(`${message.totalCorrect}/${message.totalUsers}`);
            for (var i = 0; i < message.totalUsers && i < 5; i++){
                $(`#player${i}`).html(message.userList[i].username + " - " + message.userList[i].score + " points");
            }
            $("#leaderBoard").show();
        }
        else if (message.type == "gameOver"){
            hideAll();
            $("#endingScreen").show();
        }
    }

    $("#submitBtn").on("click", () => {
        ws.send(JSON.stringify({type: "finishQuestion"}));
    });
    $("#nextQBtn").on("click", () => {
        ws.send(JSON.stringify({type: "nextQuestion"}));
    });
});

function hideAll(){
    $("#startingScreen").hide();
    $("#questionPreview").hide();
    $("#questionScreen").hide();
    $("#leaderBoard").hide();
    $("#endingScreen").hide();
}