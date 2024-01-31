$(document).ready(() => {
    $("#signupClick").on("click", ()=>{
        $.post("/signupPost", {username: $("#username").val(), password: $("#pass").val(), email: $("#email").val(), userType: $("#userType").val()}, (data) => {
            if(data.valid){
                alert("Account Successfuly Created.");
                window.location = "http://localhost:4000/login";
            }
            else{
                alert(data.message);
            }
        });
    });
});