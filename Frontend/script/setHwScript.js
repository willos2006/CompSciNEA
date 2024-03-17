$(document).ready(() => {
    $("#logoutBtn").on("click", () => {
        window.location = "http://localhost:4000/logout";
    });
    $.post("/getClasses", (data) => {
        console.log(data)
        if (data.length > 0){
            for (var i = 0; i < data.length; i++){
                $("#hwForm").append(`<input display="inline" type="checkbox" class="form-check-input" id=${data[i].classID} class="classOptn" value=${data[i].classID}/><label display="inline" for=${data[i].classID}>${data[i].quickName}</label>`);
            }
        }
        else{
            $("#hwForm").append("You own no classes");
        }
    })
});