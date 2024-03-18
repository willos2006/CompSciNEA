$(document).ready(() => {
    $("#logoutBtn").on("click", () => {
        window.location = "http://localhost:4000/logout";
    });
    $.post("/getAllHws", (data) => {
        let hws = data.hws;
        hws.forEach((hw) => {
            hw = hw[0];
            $("#hwList").append(`<li>${hw.title}<ul><li>Set for: ${hw.quickName}</li><li><a href='http://localhost:4000/homeworkDetail?hwID=${hw.hwID}'>View Details<a></li></ul></li>`)
        });
    })
});