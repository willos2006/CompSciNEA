$(document).ready(() => {
    $("#logoutBtn").on("click", () => {
        window.location = "http://localhost:4000/logout";
    });
    homeworks = [];
    activeHwID = 0;
    $.post("/getUserHomework", (data) => {
        console.log(data.homework)
        homeworks = data.homework;
        for (var i = 0; i < homeworks.length; i++){
            let hw = homeworks[i];
            let html = `<li>${hw.title}<ul><li>Class: ${hw.quickName}</li><li>Set By: ${hw.username}</li><li><a id='${hw.hwID}' data-bs-toggle="modal" data-bs-target="#hwInfoModal" class="hwHyperlink">See more info and Complete</a></li></ul></li>`
            if (new Date(hw.dueDate) <= new Date()){
                $("#overduePlaceholder").hide();
                $("#overdueList").append(html);
            }
            else{
                $("#todoPlaceholder").hide();
                $("#toDoList").append(html);
            }
        }
    });
    $(".container").on("click", '.hwHyperlink',function () {
        activeHwID = Number($(this).attr("id"));
        var hwObject = homeworks.filter((x) => {return x.hwID == activeHwID})[0];
        $("#hwTitle").html(hwObject.title);
        $("#classTxt").html("Class: " + hwObject.quickName);
        $("#setByTxt").html("Set By: " + hwObject.username);
        $("#dueDate").html("Due By: " + new Date(hwObject.dueDate).toDateString());
        $("#completionTimeTxt").html("Estimated Completion Time: " + hwObject.expectedMinutes + " minutes");
        $("#descTxt").html(hwObject.message);
    });
    $("#completeHW").on("click", () => {
        window.location = "http://localhost:4000/completeHomework?quizID="+homeworks.filter((x) => {return x.hwID == activeHwID})[0].quizID + "&hwID=" + activeHwID;
    })
});