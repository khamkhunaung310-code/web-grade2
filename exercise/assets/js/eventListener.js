// document.getElementById("btn").addEventListener("click", function () {
//     document.getElementById("result").textContent = "クリックされました！";
// });




function changeText() {
    document.getElementById("result").textContent = "クリックされました！";
}
document.getElementById("btn").addEventListener("mouseover", changeText);