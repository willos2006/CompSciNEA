$(document).ready(() => {
    $("#logoutBtn").on("click", ()=>{
        window.location = "http://localhost:4000/logout";
    });
    $("#quizOption").on("click", () => {
        window.location = "http://localhost:4000/joinQuiz";
    })
})