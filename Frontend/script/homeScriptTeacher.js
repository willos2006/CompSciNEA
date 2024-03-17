$(document).ready(()=>{
    $("#logoutBtn").on("click", ()=>{
        window.location = "http://localhost:4000/logout"
    });

    $("#classOption").on("click", ()=>{
        window.location = "http://localhost:4000/classList"
    });
    
    $("#quizOption").on("click", ()=>{
        window.location = "http://localhost:4000/quizSelect"
    });
    $("#setHwOption").on("click", () => {
        window.location = "http://localhost:4000/setHomework";
    })
});