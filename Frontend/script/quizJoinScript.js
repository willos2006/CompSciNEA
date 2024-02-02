$(document).ready(() => {
    $.post("/getQuizzesByClass", (data) => {
        if (data.gamesList.length > 0){
            $("#quizList").append("<select id='selectQuiz'>")
            for (var i = 0; i < data.gamesList.length; i++){
                var classID = data.gamesList[i].classID;
                var quizID = data.gamesList[i].quizID;
                var gameID = data.gamesList[i].gameID;
                $.post("/getQuizNameByID", {quizID: quizID}, (results) => {
                    var quizName = results.quizName;
                    $.post("/getClassNameByID", {classID: classID}, (results) => {
                        var className = results.className;
                        $("#selectQuiz").append(`<option value='${gameID}'>${quizName} - ${className}</option>`);
                    });
                })
            }
            $("#quizList").append("</select>");
            $("#quizList").append("<button class='btn btn-primary' id='goButton'>Go</button>")
            $("#goButton").on("click", () => {window.location = `http://localhost:4000/playQuiz?gameID=${$("#selectQuiz").val()}`})
        }
        else{
            $("#quizList").append("<h3>No quizzes Available</h3>");
        }
    });
});