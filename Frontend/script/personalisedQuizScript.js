$(document).ready(() => {
    $("#startQuiz").on("click", () => {
        var numberOfQuestions = $("#noOfQuestions").val();
        if (numberOfQuestions < 1){
            alert("Enter a value of one or more");
        }
        else{
            /* ... */
        }
    })
});