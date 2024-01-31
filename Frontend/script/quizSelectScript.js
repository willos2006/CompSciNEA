$(document).ready(() => {
    $("#logoutBtn").on("click", ()=>{
        window.location = "http://localhost:4000/logout"
    });
    $.post("/getQuizList", (data) => {
        if(data.length == 0){
            $("#optionDiv").append("No quizzes found.")
        }
        else{
            $("#optionDiv").append("<select id='quizSelect'>");
            for (var i = 0; i < data.length; i++){
                $("#quizSelect").append(`<option value='${data[i].quizID}'>${data[i].bio}; ${data[i].questionNo} questions</option>`);
            }
            $("#optionDiv").append("</select>");
        }
    });
    $.post("/getClasses", (data) => {
        if (data.length == 0){
            $("#optionDiv").append("No Classes Found - Please create a class to host a quiz");
        }
        else{
            $("#optionDiv").append("<select id='classSelect'>");
            for (var i = 0; i < data.length; i++){
                $("#classSelect").append(`<option value='${data[i].classID}'>${data[i].quickName}</option>`);
            }
            $("#optionDiv").append("</select>");
        }
    });
    $("#goButton").on("click", () => {
        let classID = $("#classSelect").val();
        let quizID = $("#quizSelect").val();
        window.location = `http://localhost:4000/quizHost?classID=${classID}&quizID=${quizID}`;
    })
});