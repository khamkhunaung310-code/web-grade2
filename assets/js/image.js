let isCat = true;

function changePic() {
    const img = document.getElementById("photo");
    if (isCat) {
        img.src = "assets/images/dog.jpg";
    } else {
        img.src = "assets/images/cat.jpg";
    }
    isCat = !isCat;
}
