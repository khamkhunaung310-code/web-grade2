// Global API configurations
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/gncJniqHV/";


let model, webcam, labelContainer, maxPredictions;
let isWebcamActive = false;

// Initialize Teachable Machine Engine
async function loadModel() {
    if (!model) {
        const modelURL = MODEL_URL + "model.json";
        const metadataURL = MODEL_URL + "metadata.json";
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        buildUIMetrics();
    }
}


// Generate UI Bars dynamically based on classes in the model
function buildUIMetrics() {
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";
    for (let i = 0; i < maxPredictions; i++) {
        let row = document.createElement("div");
        row.className = "prediction-row";
        row.innerHTML = `
            <div class="label-text">
                <span class="class-name">Processing...</span>
                <span class="class-percentage">0%</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill"></div>
            </div>
        `;
        labelContainer.appendChild(row);
    }
}

// Option A: Active Webcam Tracking Mode
async function initWebcam() {
    stopImageMode();
    await loadModel();

    document.getElementById("placeholder-box").style.display = "none";
    const webcamContainer = document.getElementById("webcam-container");
    webcamContainer.style.display = "block";

    if (!isWebcamActive) {
        const flip = true;
        webcam = new tmImage.Webcam(240, 240, flip);
        await webcam.setup();
        await webcam.play();
        isWebcamActive = true;
        window.requestAnimationFrame(webcamLoop);
        webcamContainer.appendChild(webcam.canvas);
    }
}

async function webcamLoop() {
    if (!isWebcamActive) return;
    webcam.update();
    await predict(webcam.canvas);
    window.requestAnimationFrame(webcamLoop);
}

// Option B: Multi-User Universal Image Upload Mode
document.getElementById('imageUpload').addEventListener('change', async function (event) {
    stopWebcamMode();
    await loadModel();

    const file = event.target.files[0];
    if (!file) return;

    document.getElementById("placeholder-box").style.display = "none";
    const imgElement = document.getElementById('imagePreview');
    const imgContainer = document.getElementById('image-container');

    imgElement.src = URL.createObjectURL(file);
    imgContainer.style.display = "block";

    // Run prediction dynamically as soon as image payload resolves
    imgElement.onload = async function () {
        await predict(imgElement);
    };
});

// Core Analytical Processor (Can process Canvas, Image or Video elements)
async function predict(inputElement) {
    const prediction = await model.predict(inputElement);
    for (let i = 0; i < maxPredictions; i++) {
        const className = prediction[i].className;
        const probability = (prediction[i].probability * 100).toFixed(0);

        const row = labelContainer.childNodes[i];
        if (row) {
            row.querySelector(".class-name").innerText = className;
            row.querySelector(".class-percentage").innerText = probability + "%";
            row.querySelector(".progress-bar-fill").style.width = probability + "%";
        }
    }
}

// State Management Utilities
function stopWebcamMode() {
    if (isWebcamActive && webcam) {
        webcam.stop();
        isWebcamActive = false;
        document.getElementById("webcam-container").innerHTML = "";
        document.getElementById("webcam-container").style.display = "none";
    }
}

function stopImageMode() {
    document.getElementById('image-container').style.display = "none";
    document.getElementById('imageUpload').value = ""; // Clear file buffer
}