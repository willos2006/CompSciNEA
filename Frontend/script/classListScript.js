$(document).ready(()=>{
    $("#logoutBtn").on("click", ()=>{
        window.location = "http://localhost:4000/logout"
    });
    $.post("/getClasses", (data)=>{
        if(data.length > 0){
            for (let i = 0; i < data.length; i++){
                $("#cont").append(`<div class="col-12" id='classCard'><h4>${data[i].quickName}</h4><a>Students: ${data[i].student.length}</a></div>`)
            }
        }
        else{
            $("#cont").append("<h3>You have no classes</h3>");
        }
    });
});