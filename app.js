document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('sentence-form');
    const sentenceInput = document.getElementById('sentence');
    const languageSelect = document.getElementById('language');
    const toneSelect = document.getElementById('tone');
    const improveBtn = document.getElementById('improve-btn');
    const loadingIndicator = document.getElementById('loading');
    const errorMessage = document.getElementById('error');
    const resultsSection = document.getElementById('results');
    const correctedOutput = document.getElementById('corrected');
    const explanationOutput = document.getElementById('explanation');
    const alternativesOutput = document.getElementById('alternatives');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const sentence = sentenceInput.value.trim();
        const language = languageSelect.value;
        const tone = toneSelect.value;

        // Input validation
        if (!sentence) {
            showError('Please enter a sentence to improve.');
            return;
        }

        // Clear previous results
        hideError();
        resultsSection.classList.add('hidden');

        // Show loading state
        setLoadingState(true);

        try {
            const response = await fetch('/api/improve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sentence: sentence,
                    language: language,
                    tone: tone
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'An error occurred while processing your request.');
            }

            // Display results
            displayResults(data);

        } catch (error) {
            showError(error.message);
        } finally {
            setLoadingState(false);
        }
    });

    function setLoadingState(isLoading) {
        improveBtn.disabled = isLoading;
        improveBtn.textContent = isLoading ? 'Generating...' : 'Improve';

        if (isLoading) {
            loadingIndicator.classList.remove('hidden');
        } else {
            loadingIndicator.classList.add('hidden');
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    function displayResults(data) {
        correctedOutput.textContent = data.corrected || 'N/A';
        explanationOutput.textContent = data.explanation || 'N/A';

        // Handle alternatives as array
        if (data.alternatives && Array.isArray(data.alternatives) && data.alternatives.length > 0) {
            const ul = document.createElement('ul');
            data.alternatives.forEach(alt => {
                const li = document.createElement('li');
                li.textContent = alt;
                ul.appendChild(li);
            });
            alternativesOutput.innerHTML = '';
            alternativesOutput.appendChild(ul);
        } else {
            alternativesOutput.innerHTML = '<p>No alternatives available.</p>';
        }

        resultsSection.classList.remove('hidden');
    }
});
