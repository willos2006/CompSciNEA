$(document).ready(() => {
    $("#startQuiz").on("click", () => {
        if ($("#noOfQuestions").val() < 1){
            alert("Enter a value of one or more");
        }
        else{
            setInterval(() => {
                $.post("/getQuestion", (data) => {
                    console.log(data);
                    let randomNumber = Math.floor(Math.random() * (5));
                    $.post("/submitQuestionAnswer", {questionID: data.question.questionID, timeToAnswer: randomNumber}, (data) => {
                        console.log(data);
                    })
                })
            }, 1500)
        }
    })
});