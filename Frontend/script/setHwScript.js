$(document).ready(() => {
    $("#logoutBtn").on("click", () => {
        window.location = "http://localhost:4000/logout";
    });
    $.post("/getClasses", (data) => {
        if (data.length > 0){
            for (var i = 0; i < data.length; i++){
                $("#class").append(`<option id='${data[i].classID}' value='${data[i].classID}'>${data[i].quickName}</option>`);
            }
        }
        else{
            $("#class").append("You own no classes");
        }
    });
    $.post("/getQuizList", (data) => {
        if (data.length > 0){
            for (var i = 0; i < data.length; i++){
                $("#quiz").append(`<option id='${data[i].quizID}' value='${data[i].quizID}'>${data[i].bio}; ${data[i].questionNo} questions`);
            }
        }
        else{
            $("#quiz").append("Error. Please reload the page.")
        }
    });
    $("#setHwBtn").on("click", () => {
        var validCheck = checkValidData();
        if (validCheck.valid){
            $.post("/setHomework", {title: $("#title").val(), desc: $("#description").val(), due: new Date($("#date").val()), time: $("#time").val(), classID: $("#class").val(), quizID: $("#quiz").val()}, (data) => {
                alert(data.message);
                if (data.valid){
                    window.location = "http://localhost:4000/"
                }
            });
        }
        else{
            let str = "";
            validCheck.issues.map((item) => {str += (`${item}\n`)});
            alert(str);
        }
    });
});

function checkValidData(){
    let issues = [];
    if($("#title").val() == ""){
        issues.push("Missing Title");
    }

    if($("#description").val() == ""){
        issues.push("Missing Description");
    }

    if($("#date").val() == ""){
        issues.push("Missing Date");
    }
    else if(new Date($("#date").val()).getTime() <= new Date().getTime()){
        issues.push("Due date is in past");
    }

    if($("#time").val() == 0){
        issues.push("Missing Time");
    }
    let validInputs = issues.length == 0;
    return {valid: validInputs, issues: issues}
}