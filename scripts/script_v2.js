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
let localCache = {}; // Local cache for the session

// retrieve data from Firebase - restricted to first 337 words to read from DB less
db.collection("mounce").where("dbSequence", "<", 338).orderBy("dbSequence").get()
  .then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      localCache[doc.id] = doc.data(); // Store each document in localCache
    });
    
    regroupWords();  
  })
  .catch((error) => {
    console.error('Error loading initial data:', error);
  });



let selectedGroups = []; // to store groups that will be reviewed
let selectedWords = []; // words for review
let selectedDefinitions = []; // definitions for review
let selectedChapters = []; // chapters for review
let selectedFrequencies = []; // frequencies for review
let selectedAudio = [];
let selectedDifficulties = [];
let currentIndex = 0; // to track word/definition pairs from these arrays
let autoplay = false;
let autoplayIntervalId = null; // To track the interval for autoplay
let timerBarActive = false;    // Track if timerBar is active for immediate pause
let currentDocId; // Used for updates

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
        const groupAudio = JSON.parse(clickedCard.getAttribute("data-audio"));
        const groupDifficulties = JSON.parse(clickedCard.getAttribute("data-difficulties"));

        // Add or remove group data based on its active status
        if (clickedCard.classList.contains("active") && groupIndex === -1) {
            selectedGroups.push(clickedCard);
            selectedWords = selectedWords.concat(groupWords);
            selectedDefinitions = selectedDefinitions.concat(groupDefinitions);
            selectedChapters = selectedChapters.concat(groupChapters);
            selectedFrequencies = selectedFrequencies.concat(groupFrequencies);
            selectedAudio = selectedAudio.concat(groupAudio);
            selectedDifficulties = selectedDifficulties.concat(groupDifficulties);
        } else if (!clickedCard.classList.contains("active") && groupIndex !== -1) {
            selectedGroups.splice(groupIndex, 1);
            selectedWords = selectedWords.filter(word => !groupWords.includes(word));
            selectedDefinitions = selectedDefinitions.filter(def => !groupDefinitions.includes(def));
            selectedChapters = selectedChapters.filter(chap => !groupChapters.includes(chap));
            selectedFrequencies = selectedFrequencies.filter(freq => !groupFrequencies.includes(freq));
            selectedAudio = selectedAudio.filter(audio => !groupAudio.includes(audio));
            selectedDifficulties = selectedDifficulties.filter(diff => !groupDifficulties.includes(diff));
        }
    }
});

// Regroup Words Function
async function regroupWords() {
    const groupBy = document.getElementById("group-by").value; // Get the selected column
    try {
        document.getElementById("loading-container").style.display = "flex"; // Show loading screen

       // const querySnapshot = await db.collection("mounce").orderBy("dbSequence").get();
        const groupedWords = {};

// Iterate over the localCache to group words
for (const docId in localCache) {
  const word = { id: docId, ...localCache[docId] };
  const groupKey = word[groupBy];

  if (!groupedWords[groupKey]) {
    groupedWords[groupKey] = []; // Create a new group if it doesn't exist
  }
  groupedWords[groupKey].push(word);
}
        
        

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
            const audio = groupedWords[key].map((word) => word.dbSayWordFile);
            const difficulties = groupedWords[key].map((word) => word.dbDifficulty);

            groupDiv.setAttribute("data-words", JSON.stringify(words));
            groupDiv.setAttribute("data-definitions", JSON.stringify(definitions));
            groupDiv.setAttribute("data-chapters", JSON.stringify(chapters));
            groupDiv.setAttribute("data-frequencies", JSON.stringify(frequencies));
            groupDiv.setAttribute("data-audio", JSON.stringify(audio));
            groupDiv.setAttribute("data-difficulties", JSON.stringify(difficulties));
            
            groupDiv.innerHTML = `${groupBy.charAt(2).toUpperCase() + groupBy.slice(3)}: ${key}`;

            container.appendChild(groupDiv);
        });
        
        clearGroups();
        
        console.log(`Words regrouped by ${groupBy} and added as attributes.`);
    } catch (error) {
        console.error("Error regrouping words: ", error);
    } finally {
        document.getElementById("loading-container").style.display = "none"; // Hide spinner
    }
}


// Updated startReview to handle autoplay correctly
function startReview() {
    const intervalOption = document.getElementById("intervalOption").value || 0;
    document.getElementById("autoplayBtn").textContent = autoplay ? "Stop autoplay" : "Start autoplay";

    // if user has selected the advanced filter tab
    if (document.getElementById("tab2").classList.contains("active")) {
        const advFilter = advancedFilter();
        
        selectedWords = Object.values(advFilter).map(item => item.dbWord);
        selectedDefinitions = Object.values(advFilter).map(item => item.dbMeaning);
        selectedChapters = Object.values(advFilter).map(item => item.dbChapter);
        selectedFrequencies = Object.values(advFilter).map(item => item.dbFrequency);
        selectedAudio = Object.values(advFilter).map(item => item.dbAudio);
        selectedDifficulties = Object.values(advFilter).map(item => item.dbDifficulty);
    }
    
    if (selectedWords.length > 0) {
        if (document.getElementById("shuffleOption").checked) {
            shuffleWordDef();
        }
        currentIndex = 0;
        document.getElementById("tabletop").classList.remove("hidden");
        showWordDef();

        // Start autoplay if enabled
        if (autoplay && intervalOption !== "0") {
            startAutoplay(Number(intervalOption) * 1000);
        }
    }
}

//some options have suboptions that are hidden until needed
document.querySelectorAll('.option:not(.noSubOption) input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
        const parentOption = this.parentElement;
        const siblingOption = parentOption.nextElementSibling;
        parentOption.classList.toggle("noBorder");
        siblingOption.classList.toggle("hidden");
    });
});

// Start review button
document.getElementById("startReviewBtn").addEventListener("click", function () {
    autoplay = document.getElementById("timerOption").checked;
    
    document.getElementById("autoplayBtn").textContent = autoplay ? "Stop autoplay" : "Start autoplay";
    
    startReview();
});

// Close review button
// Stop everything when review is closed
document.getElementById("closeReviewBtn").addEventListener("click", function () {
    pauseAutoplay(); // Ensure autoplay is stopped
    autoplay = false;
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


// Play Greek audio
document.getElementById("flashcardAudioFront").addEventListener("click", function () {
    document.getElementById("audioPlayerFront").play();
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
        const audioPlayerFront = document.getElementById("audioPlayerFront");
           audioPlayerFront.src = `https://github.com/kalebirey/kalebirey.github.io/raw/refs/heads/main/GreekAudio/${selectedAudio[currentIndex]}.mp3`;
           audioPlayerFront.load();
           
        const flashcardDifficultyFront = document.getElementById("flashcardDifficultyFront");
        const flashcardDifficultyBack = document.getElementById("flashcardDifficultyBack");
        
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
        flashcardDifficultyFront.textContent = `Difficulty: `;
        document.getElementById("difficulty-select").value = selectedDifficulties[currentIndex];
        flashcardDifficultyBack.textContent = `Difficulty: `;
        document.getElementById("difficulty-select-back").value = selectedDifficulties[currentIndex];
        
        currentDocId = Object.keys(localCache).find(docId => localCache[docId]["dbWord"] === selectedWords[currentIndex]);
        console.log(`For word ${selectedWords[currentIndex]}, DocId is ${currentDocId}`);
        
        
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
        frequency: selectedFrequencies[index],
        audio: selectedAudio[index]
    }));

    for (let i = pairedArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairedArray[i], pairedArray[j]] = [pairedArray[j], pairedArray[i]];
    }

    selectedWords = pairedArray.map(pair => pair.word);
    selectedDefinitions = pairedArray.map(pair => pair.definition);
    selectedChapters = pairedArray.map(pair => pair.chapter);
    selectedFrequencies = pairedArray.map(pair => pair.frequency);
    selectedAudio = pairedArray.map(pair => pair.audio);
}

// pause function
function delay(ms) {
    return new Promise(resolve =>
    setTimeout(resolve, ms))
}













// all the autoplay/timer stuff
// Updated Timer Bar Functionality
function startTimerBar(interval) {
    const timerBar = document.getElementById("timerBar");

    timerBar.style.transition = "none"; // Reset transition
    timerBar.style.width = "0%";

    // Trigger reflow for proper reset
    void timerBar.offsetWidth;

    timerBar.style.transition = `width ${interval}ms linear`; // Set transition duration
    timerBar.style.width = "100%";

    timerBarActive = true; // Mark the timer bar as active
}

function stopTimerBar() {
    const timerBar = document.getElementById("timerBar");
    timerBar.style.transition = "none";
    timerBar.style.width = "0%"; // Reset width immediately
    timerBarActive = false; // Mark the timer bar as inactive
}

// Updated Autoplay Functionality
function startAutoplay(interval) {
    // Clear any previous intervals to avoid overlaps
    if (autoplayIntervalId) {
        clearInterval(autoplayIntervalId);
    }

    autoplay = true;
    // startTimerBar(interval); // Start the timer bar immediately
    startTimerBar(interval);
    autoplayRepeater(interval);
    
    // Execute the first cycle immediately
    autoplayIntervalId = setInterval(() => {
        if (autoplay) {
            autoplayRepeater(interval);
        }
    }, interval * 2);
}

function autoplayRepeater(interval) {
    // Flip the flashcard after the interval
    setTimeout(() => {
        if (!autoplay) {
            console.log("Autoplay stopped.");
            return;
        }
        document.querySelector(".flashcard").classList.add("flipped");
        startTimerBar(interval); // Restart the timer bar for the next cycle
    }, interval);

    // Navigate to the next flashcard after the full interval happens twice
    setTimeout(() => {
        if (!autoplay) {
            console.log("TimerBar stopped.");
            return;
        }
        navigateFlashcards("next");
        startTimerBar(interval); // Restart the timer bar for the next cycle
    }, interval * 2);
}

function pauseAutoplay() {
    if (autoplayIntervalId) {
        clearInterval(autoplayIntervalId);
        autoplayIntervalId = null;
    }
    autoplay = false;
    stopTimerBar(); // Stop and reset the timer bar immediately
}

function toggleAutoplay(interval) {
    if (autoplay) {
        pauseAutoplay();
        document.getElementById("autoplayBtn").textContent = "Start autoplay";
    } else {
        startAutoplay(interval);
        document.getElementById("autoplayBtn").textContent = "Stop autoplay";
    }
}

// Autoplay Button Event Listener
document.getElementById("autoplayBtn").addEventListener("click", function () {
    const intervalOption = document.getElementById("intervalOption").value || 0;
    toggleAutoplay(Number(intervalOption) * 1000);
});








 
function updateData(dataPoint, newData) {
  // parse newData for certain updates
  newData = dataPoint === "dbDifficulty" ? parseInt(newData, 10) : newData;
    
    //update relevant arrays
    if (dataPoint === "dbDifficulty") selectedDifficulties[currentIndex] = newData;
    
    // Update the local cache
  if (!localCache[currentDocId]) {
    localCache[currentDocId] = {}; // Initialize if it doesn't exist
  }
  
  localCache[currentDocId][dataPoint] = newData; // Update the specific key with the new value

  // Immediately update Firebase
  db.collection("mounce").doc(currentDocId).set(
    { [dataPoint]: newData }, // Use bracket notation to dynamically set the field
    { merge: true } // Merge to avoid overwriting the entire document
  )
    .then(() => {
      console.log(`Document ${currentDocId} updated in Firebase`);
    })
    .catch((error) => {
      console.error(`Error updating document ${currentDocId} in Firebase:`, error);
    });
}


function validateInput(input) {
  const errorSpan = document.getElementById(`${input.id}Error`);
  errorSpan.textContent = ''; // Clear previous error

  if (!input.checkValidity()) {
    errorSpan.textContent = input.validationMessage;
  }
    
    if (document.getElementById("frequencyMin").value > document.getElementById("frequencyMax").value) {
       document.getElementById("frequencyMaxError").textContent += " Min freq must be lower than Max freq."
   }
    
}

function advancedFilter() {
    const advSelectedChapters = document.getElementById("chapterSelect").selectedOptions;
      const chapValues = Array.from(advSelectedChapters).map(option => Number(option.value));
    const advSelectedDifficulties = document.getElementById("difficultySelect").selectedOptions;
      const diffValues = Array.from(advSelectedDifficulties).map(option => Number(option.value));
    const advSelectedTypes = document.getElementById("typeSelect").selectedOptions;
      const typeValues = Array.from(advSelectedTypes).map(option => option.value);
    const advFreqMin = document.getElementById("frequencyMin").value;
    const advFreqMax = document.getElementById("frequencyMax").value;
    
    
    return Object.fromEntries(Object.entries(localCache).filter(([key,value]) => 
      chapValues.includes(value.dbChapter) &&
      diffValues.includes(value.dbDifficulty) &&
      typeValues.includes(value.dbType) &&
      advFreqMin <= value.dbFrequency &&
      advFreqMax >= value.dbFrequency
      )
    );
}

function clearGroups() {
    document.querySelectorAll(".groupCard").forEach(card => {
      card.classList.remove("active");
    });
    
    selectedGroups = [];
    selectedWords = [];
    selectedDefinitions = [];
    selectedChapters = [];
    selectedFrequencies = [];
    selectedAudio = [];
    selectedDifficulties = [];
}


const allMultiSelects = document.querySelectorAll(".multiSelect");

allMultiSelects.forEach(selectElement => {
selectElement.addEventListener("change", (event) => {
  const selectedValue = event.target.value;

  if (selectedValue === "SelectAll") {
    // Select all options except "Select All" and "Deselect All"
    Array.from(selectElement.options).forEach(option => {
      if (option.value !== "DeselectAll") {
        option.selected = true;
      }
    });
  } else if (selectedValue === "DeselectAll") {
    // Deselect all options
    Array.from(selectElement.options).forEach(option => {
      option.selected = false;
    });
  }
    
});
});



// JavaScript to handle tab switching
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        document.getElementById(tab.dataset.target).classList.add('active');
      });
    });


// Toggle the slide-out tab when the handle is clicked
    document.getElementById('tabHandle').addEventListener('click', function () {
      const tab = document.getElementById('slideTab');
      tab.classList.toggle('open');
    });

