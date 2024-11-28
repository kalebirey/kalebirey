const flashcardView = document.getElementById('flashcardView');
const flashcardContent = document.getElementById('flashcardContent');
const closeFlashcards = document.getElementById('closeFlashcards');
const prevFlashcard = document.getElementById('prevFlashcard');
const nextFlashcard = document.getElementById('nextFlashcard');

// Example flashcard data
const flashcardSets = {
    set1: ["Word 1 - Definition 1", "Word 2 - Definition 2", "Word 3 - Definition 3"],
    set2: ["Word A - Definition A", "Word B - Definition B", "Word C - Definition C"],
    set3: ["Word X - Definition X", "Word Y - Definition Y", "Word Z - Definition Z"]
};

let currentSet = [];
let currentIndex = 0;

document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
        const setKey = card.getAttribute('data-set');
        currentSet = flashcardSets[setKey] || [];
        currentIndex = 0;
        showFlashcard();
    });
});

function showFlashcard() {
    flashcardContent.textContent = currentSet[currentIndex] || "No flashcards available.";
    flashcardView.style.display = 'block';
}

closeFlashcards.addEventListener('click', () => {
    flashcardView.style.display = 'none';
});

prevFlashcard.addEventListener('click', () => {
    if (currentSet.length > 0) {
        currentIndex = (currentIndex - 1 + currentSet.length) % currentSet.length;
        showFlashcard();
    }
});

nextFlashcard.addEventListener('click', () => {
    if (currentSet.length > 0) {
        currentIndex = (currentIndex + 1) % currentSet.length;
        showFlashcard();
    }
});
