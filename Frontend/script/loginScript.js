$(document).ready(()=>{
    $("#loginclick").on("click", ()=>{
        $.post("/loginPost", {email: $("#email").val(), pass: $("#pass").val()}, (data) => {
            if(data.valid){
                window.location.assign("http://localhost:4000/home");
            }
            else{
                alert(data.message);
            }
        },"json")
    })
})