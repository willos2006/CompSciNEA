$(document).ready(() => {
    $("#logoutBtn").on("click", () => {
        window.location = "http://localhost:4000/logout";
    });

    var urlParams = new URLSearchParams(window.location.search);
    const entries = urlParams.entries();
    const params = {};
    for (entry of entries) {
        params[entry[0]] = entry[1];
    }
    var hwID = params.hwID;

    var hwDetails;
    var hwSubmissions;

    $.ajaxSetup({async: false});
    $.post("/getHwDetails", {hwID: hwID}, (data) => {
        hwDetails = data.hwDetails;
        hwSubmissions = data.submissions;
    });

    $("#hwTitle").html(hwDetails.title);
    $("#dueDate").html("Due " + new Date(hwDetails.dueDate).toDateString());
    $("#usersSubmitted").html(hwSubmissions.length + " student(s) submitted");
    $("#message").html(hwDetails.message);

    if(hwSubmissions.length > 0){
        $("#infoDiv").append("<ul>");
        hwSubmissions.forEach((submission) => {
            $("#infoDiv").append(`<li>${submission.username}<ul><li><a style="color: blue; text-decoration: underline" id='${submission.userID}' data-bs-toggle="modal" data-bs-target="#hwInfoModal" class='detailView'>View Details</a></li></ul></li>`)
        });
        $("#infoDiv").append("</ul>");
    }
    else{
        $("#infoDiv").append("<h3>No Submissions</h3>")
    }

    $("#infoDiv").on("click", ".detailView", function(){
        let userID = $(this).attr("id");
    });
});