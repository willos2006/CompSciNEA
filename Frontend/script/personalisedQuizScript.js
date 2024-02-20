$(document).ready(() => {
    $("#startQuiz").on("click", () => {
        if ($("#noOfQuestions").val() < 1){
            alert("Enter a value of one or more");
        }
        else{
            $.post("/getPersonalisedQuiz", {noOfQuestions: $("#noOfQuestions").val()}, (data) => {
                //logic
            });
        }
    })
});