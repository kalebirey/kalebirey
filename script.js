console.log("Using script_v2"); //debug log

// Initialize Firebase (ensure the config is set up in your HTML or JS file)
const firebaseConfig = {
    apiKey: "AIzaSyCzdR3K4D6b1ZmNWLewZtKAx4efq6owdYg",
    authDomain: "kalebs-greek-app.firebaseapp.com",
    projectId: "kalebs-greek-app",
    storageBucket: "kalebs-greek-app.firebasestorage.app",
    messagingSenderId: "356625350172",
    appId: "1:356625350172:web:98577214137afd263469d9"
};

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);

// Use Firebase Functionality
const db = firebase.firestore();

let selectedGroups = []; // to store groups that will be reviewed
let selectedWords = []; // words for review
let selectedDefinitions = []; // definitions for review
let selectedChapters = []; // chapters for review
let selectedFrequencies = []; // frequencies for review
let currentIndex = 0; // to track word/definition pairs from these arrays

// Event delegation for dynamically created groupCards
document.getElementById("group-container").addEventListener("click", function (event) {
    const clickedCard = event.target.closest(".groupCard");
    if (clickedCard) {
        clickedCard.classList.toggle("active");

        // Check if the group is already selected
        const groupIndex = selectedGroups.indexOf(clickedCard);

        // Extract data from the card
        const groupWords = JSON.parse(clickedCard.getAttribute("data-words"));
        const groupDefinitions = JSON.parse(clickedCard.getAttribute("data-definitions"));
        const groupChapters = JSON.parse(clickedCard.getAttribute("data-chapters"));
        const groupFrequencies = JSON.parse(clickedCard.getAttribute("data-frequencies"));

        // Add or remove group data based on its active status
        if (clickedCard.classList.contains("active") && groupIndex === -1) {
            selectedGroups.push(clickedCard);
            selectedWords = selectedWords.concat(groupWords);
            selectedDefinitions = selectedDefinitions.concat(groupDefinitions);
            selectedChapters = selectedChapters.concat(groupChapters);
            selectedFrequencies = selectedFrequencies.concat(groupFrequencies);
        } else if (!clickedCard.classList.contains("active") && groupIndex !== -1) {
            selectedGroup.splice(groupIndex, 1);
            selectedWords = selectedWords.filter(word => !groupWords.includes(word));
            selectedDefinitions = selectedDefinitions.filter(def => !groupDefinitions.includes(def));
            selectedChapters = selectedChapters.filter(chap => !groupChapters.includes(chap));
            selectedFrequencies = selectedFrequencies.filter(freq => !groupFrequencies.includes(freq));
        }
    }
});

// Regroup Words Function
async function regroupWords() {
    const groupBy = document.getElementById("group-by").value; // Get the selected column
    try {
        document.getElementById("loading-container").style.display = "flex"; // Show loading screen

        const querySnapshot = await db.collection("mounce").orderBy("dbSequence").get();
        const groupedWords = {};

        // Group words by the selected column
        querySnapshot.forEach((doc) => {
            const word = { id: doc.id, ...doc.data() };
            const groupKey = word[groupBy];

            if (!groupedWords[groupKey]) {
                groupedWords[groupKey] = []; // Create a new group if it doesn't exist
            }
            groupedWords[groupKey].push(word);
        });

        // Update the DOM
        const container = document.getElementById("group-container");
        container.innerHTML = ""; // Clear previous content

        Object.keys(groupedWords).forEach((key) => {
            const groupDiv = document.createElement("div");
            groupDiv.setAttribute("class", "groupCard");

            const words = groupedWords[key].map((word) => word.dbWord);
            const definitions = groupedWords[key].map((word) => word.dbMeaning);
            const chapters = groupedWords[key].map((word) => word.dbChapter);
            const frequencies = groupedWords[key].map((word) => word.dbFrequency);

            groupDiv.setAttribute("data-words", JSON.stringify(words));
            groupDiv.setAttribute("data-definitions", JSON.stringify(definitions));
            groupDiv.setAttribute("data-chapters", JSON.stringify(chapters));
            groupDiv.setAttribute("data-frequencies", JSON.stringify(frequencies));
            
            
            groupDiv.innerHTML = `${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}: ${key}`;

            container.appendChild(groupDiv);
        });
        
        selectedGroups = [];
        selectedWords = [];
        selectedDefinitions = [];
        selectedChapters = [];
        selectedFrequencies = [];
        
        console.log(`Words regrouped by ${groupBy} and added as attributes.`);
    } catch (error) {
        console.error("Error regrouping words: ", error);
    } finally {
        document.getElementById("loading-container").style.display = "none"; // Hide spinner
    }
}

regroupWords();

// Start review button
document.getElementById("startReviewBtn").addEventListener("click", function () {
    // If some words are selected, start at the first word and bring up the flashcard
    if (selectedWords.length > 0) {
        if (document.getElementById("shuffleOption").checked) {
            shuffleWordDef();
        }
        currentIndex = 0;
        document.getElementById("tabletop").classList.remove("hidden");
        showWordDef();
    }
});

// Close review button
document.getElementById("closeReviewBtn").addEventListener("click", function () {
    document.getElementById("tabletop").classList.add("hidden");
});

// Flip flashcard button
document.getElementById("flipBtn").addEventListener("click", function () {
    document.querySelector(".flashcard").classList.toggle("flipped");
});

// Prev flashcard button - if at beginning, cycles to end
document.getElementById("prevBtn").addEventListener("click", function () {
    navigateFlashcards("prev");
});

// Next flashcard button - if at end, cycles to beginning
document.getElementById("nextBtn").addEventListener("click", function () {
    navigateFlashcards("next");
});

// Helper function to show the current word and definition
function showWordDef() {
    if (selectedWords.length > 0 && currentIndex >= 0 && currentIndex < selectedWords.length) {
        const flashcardNumberFront = document.getElementById("flashcardNumberFront");
        const flashcardNumberBack = document.getElementById("flashcardNumberBack");
        const flashcardFront = document.getElementById("flashcardFront");
        const flashcardBack = document.getElementById("flashcardBack");
        const flashcardChapterFront = document.getElementById("flashcardChapterFront");
        const flashcardChapterBack = document.getElementById("flashcardChapterBack");
        const flashcardFreqFront = document.getElementById("flashcardFreqFront");
        const flashcardFreqBack = document.getElementById("flashcardFreqBack");

        if (document.querySelector(".flashcard").classList.contains("flipped")) {
            document.querySelector(".flashcard").classList.remove("flipped");
        }

        flashcardNumberFront.textContent = `${currentIndex + 1} / ${selectedWords.length}`;
        flashcardNumberBack.textContent = `${currentIndex + 1} / ${selectedWords.length}`;
        flashcardFront.textContent = selectedWords[currentIndex];
        flashcardBack.textContent = selectedDefinitions[currentIndex];
        flashcardChapterFront.textContent = `Chapter: ${selectedChapters[currentIndex]}`;
        flashcardChapterBack.textContent = `Chapter: ${selectedChapters[currentIndex]}`;
        flashcardFreqFront.textContent = `Frequency: ${selectedFrequencies[currentIndex]}`;
        flashcardFreqBack.textContent = `Frequency: ${selectedFrequencies[currentIndex]}`;
    }
}

// Helper function to navigate flashcards
function navigateFlashcards(direction) {
    const flashcard = document.querySelector(".flashcard");
    flashcard.classList.add(direction === "next" ? "slideOutLeft" : "slideOutRight");
    flashcard.addEventListener("animationend", function handler1() {
        flashcard.removeEventListener("animationend", handler1);

        if (direction === "next") {
            currentIndex = (currentIndex + 1) % selectedWords.length;
        } else {
            currentIndex = (currentIndex - 1 + selectedWords.length) % selectedWords.length;
        }

        showWordDef();

        flashcard.classList.add(direction === "next" ? "slideInRight" : "slideInLeft");
        flashcard.classList.remove(direction === "next" ? "slideOutLeft" : "slideOutRight");
        flashcard.addEventListener("animationend", function handler2() {
            flashcard.removeEventListener("animationend", handler2);
            flashcard.classList.remove(direction === "next" ? "slideInRight" : "slideInLeft");
        });
    });
}

// Helper function to shuffle words and definitions
function shuffleWordDef() {
    const pairedArray = selectedWords.map((word, index) => ({
        word: word,
        definition: selectedDefinitions[index],
        chapter: selectedChapters[index],
        frequency: selectedFrequencies[index]
    }));

    for (let i = pairedArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairedArray[i], pairedArray[j]] = [pairedArray[j], pairedArray[i]];
    }

    selectedWords = pairedArray.map(pair => pair.word);
    selectedDefinitions = pairedArray.map(pair => pair.definition);
    selectedChapters = pairedArray.map(pair => pair.chapter);
    selectedFrequencies = pairedArray.map(pair => pair.frequency);
}
