$(document).ready(() => {
    $("#logoutBtn").on("click", () => {
        window.location = "http://localhost:4000/logout";
    });
    $("#submitBtn").on("click", () => {
        $.post("/addUserToClassByCode", {uniqueCode: $("#code").val()}, (data) => {
            if(data.res){
                alert("Successfully added to class");
                window.location = "http://localhost:4000/studentClassView";
            }
            else{
                alert(data.errorMsg);
            }
        })
    });
    $.post("/getStudentClassesByID", data => {
        for (var i = 0; i < data.classList.length; i++){
            var className = data.classList[i].quickName;
            var teacherName = data.classList[i].username;
            $("#classList").append(`<li>Class Name ${className}<ul><li>Teacher: ${teacherName}</li></ul></li>`)
        }
    });
});