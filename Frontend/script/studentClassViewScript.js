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
});