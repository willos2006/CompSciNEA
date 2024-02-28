$(document).ready(() => {
    //Getting the classID of the class from the query string in the URL
    var urlParams = new URLSearchParams(window.location.search);
    const entries = urlParams.entries();
    const params = {};
    for (entry of entries) {
        params[entry[0]] = entry[1];
    }
    var classID = params.classID;

    $.ajaxSetup({async: false});
    var classObj;
    $.post("/getClasses", (data) => {
        classObj = data.filter(x => {return x.classID = classID})[0];
    });
    for (var user = 0; user < classObj.student.length; user++){
        $.ajaxSetup({async: false});
        $.post("/getUserAnalyticsByID", {userID: classObj.student[user].userID}, (data) => {
            console.log(data);
        })
    }

    $("#logoutBtn").on("click", () => {
        window.location = "http://localhost:4000/logout";
    });
});