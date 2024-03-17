$(document).ready(() => {
    var urlParams = new URLSearchParams(window.location.search);
    const entries = urlParams.entries();
    const params = {};
    for (entry of entries) {
        params[entry[0]] = entry[1];
    }
    var quizID = params.quizID;
    var hwID = params.hwID;

    $.ajaxSetup({async: false});
    $.post("/getQuizByID", {quizID: quizID}, (data) => {
        questions = data.questions;
        nextQuestion(currQuestion);
    });

    $.post("/validHomework", {hwID: hwID, quizID}, (data) => {
        if(!data.res){
            alert(data.message);
            window.location = "http://localhost:4000";
        }
    })

    $(".option").on("click", function() {
        answerMap = {
            0: "ansA",
            1: "ansB",
            2: "ansC",
            3: "ansD"
        }
        let answer = Number($(this).attr("id"));
        var res;
        let correctAns = Number(questions[currQuestion].correctAns);
        if (answer == correctAns){
            $("#resultText").html("Your answer was correct!");
            questions[currQuestion].result = 1;
        }
        else{
            $("#resultText").html("Your answer was incorrect! Correct answer: " + questions[currQuestion][answerMap[correctAns]]);
            questions[currQuestion].result = 0;
        }
        let timeTaken = (new Date() - startTime) / 1000;
        $("#timetakenText").html(`You took ${timeTaken}s to Answer`);
        questions[currQuestion].timetaken = timeTaken;
        $("#questionDiv").hide();
        $("#overviewDiv").show();
    });

    $("#next").on("click", () => {
        if (currQuestion < questions.length - 1){
            nextQuestion();
        }
        else{
            $.post("/submitHomework", {hwID: hwID, questions: questions}, (data) => {
                if (!data.res){
                    alert("There was an error processing your results.")
                }
            });
            let total = 0;
            questions.map((question) => {total += question.timetaken});
            let avgTime = total / questions.length;
            questions.map((question) => {
                if(question.result == 0) question.timetaken *= 10;
            });
            console.log(questions)
            questions.sort((a,b) => a.timetaken - b.timetaken);
            $("#bestQuestionTxt").html(questions[0].question);
            $("#worstQuestionTxt").html(questions[questions.length - 1].question);
            $("#timeTxt").html(avgTime);
            $("#overviewDiv").hide();
            $("#completed").show();
        }
    })
});

var questions = []
var currQuestion = -1;
var startTime = new Date();

function nextQuestion(){
    if(currQuestion < questions.length - 1){
        currQuestion += 1;
        let questionObj = questions[currQuestion];
        $("#question").html(questionObj.question);
        $("#0").html(questionObj.ansA);
        $("#1").html(questionObj.ansB);
        $("#2").html(questionObj.ansC);
        $("#3").html(questionObj.ansD);
        $("#overviewDiv").hide();
        $("#questionDiv").show();
        startTime = new Date();
    }
}