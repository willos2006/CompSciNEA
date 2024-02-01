$(document).ready(() => {
    $.post("/getQuizzesByClass", (data) => {
        if (data.gamesList.length > 0){
            $("#quizList").append("<select id='selectQuiz'>")
            for (var i = 0; i < data.gamesList.length; i++){
                var classID = data.gamesList[i].classID;
                var quizID = data.gamesList[i].quizID;
                $.post("/getQuizNameByID", {quizID: quizID}, (err, results) => {
                    if (err) throw (err);
                    var quizName = results[0].quizName;
                    $.post("/getClassNameByID", {classID: classID}, (err, results) => {
                        if (err) throw (err);
                        var className = results[0].className;
                        $("#selectQuiz").push(`<option value=${gameID}>${quizName} - ${className}</option>`);
                    });
                })
            }
            $("#quizList").append("</select>");
        }
        else{
            $("#quizList").append("<h3>No quizzes Available</h3>");
        }
    });
});