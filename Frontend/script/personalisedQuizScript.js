var startTime; //global to measure time taken
var currentQuestion; //global to access question

$(document).ready(() => {
    $(".qOption").on("click", function (){
        let option = Number($(this).attr("id"));
        let timeTaken = (new Date().getTime() / 1000) - startTime;
        $("#timeText").html(timeTaken);
        if (option == currentQuestion.correctAns){
            $("#resultText").html("correct!");
        }
        else{
            timeTaken = timeTaken * 100;
            $("#resultText").html("incorrect");
        }
        submitAnswer(currentQuestion.questionID, timeTaken);
        hideAll();
        $("#resultScreen").show();
    });
    $("#nextQuestionBtn").on("click", () => {
        displayNextQuestion();
    });
    $("#quitBtn").on("click", () => {
        window.location = "http://localhost:4000/";
    });
    displayNextQuestion();
});

function displayNextQuestion(){
    currentQuestion = getQuestion();
    startTime = new Date().getTime() / 1000;
    hideAll();
    $("#question").html(currentQuestion.question);
    $("#0").html(currentQuestion.ansA);
    $("#1").html(currentQuestion.ansB);
    $("#2").html(currentQuestion.ansC);
    $("#3").html(currentQuestion.ansD);
    $("#questionScreen").show();
}

function getQuestion(){
    $.ajaxSetup({async: false});
    var questionData;
    $.post("/getQuestion", (data) => {
        questionData = data;
    });
    return questionData.questionData;
}

function submitAnswer(questionID, timeToAnswer){
    $.ajaxSetup({async: false});
    $.post("/submitQuestionAnswer", {questionID: questionID, timeToAnswer: timeToAnswer}, (data) => {
        if(!data.res){
            alert("error");
        }
    });
}

function hideAll(){
    $("#questionScreen").hide();
    $("#resultScreen").hide();
}