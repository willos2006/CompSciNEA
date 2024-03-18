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

    hwDetails.questions.forEach((question) => {
        $("#questionsPreview").append(`<li>${question.question}</li>`);
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
        let userSubmissions = hwSubmissions.filter((sub) => {return sub.userID = userID})[0];
        $("#userName").html(`Student: ${userSubmissions.username}`);
        let totalTime = 0;
        let totalCorrect = 0;
        resultMap = {
            0: "incorrect",
            1: "correct"
        };
        $("#questionsOverview").html("");
        userSubmissions.questions.forEach((question) => {
            if(question.result == 1) totalCorrect += 1;
            totalTime += question.timeTaken;
            let html = `<li>${question.question}</li>`;
            html += `<ul>`;
            html += `<li>Answer was: ${resultMap[question.result]}</li>`;
            html += `<li>Time to answer: ${question.timeTaken}s</li>`;
            html += `</ul>`;
            $("#questionsOverview").append(html);
        });
        $("#submitted").html(`Submitted on: ${new Date(userSubmissions.questions[0].dateSubmitted).toDateString()}`);
        $("#avgTime").html(`Average time: ${Math.round((totalTime / userSubmissions.questions.length)*100)/100}s`);
        $("#totalCorrect").html(`${totalCorrect} question(s) correct in total`);
    });
});